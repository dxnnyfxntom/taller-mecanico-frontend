import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { Cliente, TipoCombustible, Vehiculo } from '../../models/api.models';
import { mensajeDeFormulario } from '../../services/error-api';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-vehiculos',
  imports: [ReactiveFormsModule],
  templateUrl: './vehiculos.component.html',
  styleUrl: './vehiculos.component.scss',
})
export class VehiculosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);

  protected readonly vehiculos = signal<Vehiculo[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroCliente = signal(0);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<Vehiculo | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly combustibles: TipoCombustible[] = ['GASOLINA', 'GLP', 'GNV', 'DIESEL'];

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const clienteId = this.filtroCliente();

    return this.vehiculos().filter((vehiculo) => {
      const coincideCliente = !clienteId || vehiculo.cliente?.id === clienteId;
      const coincideTexto =
        !texto ||
        [vehiculo.placa, vehiculo.marca, vehiculo.modelo, vehiculo.cliente?.nombreCompleto ?? '']
          .join(' ')
          .toLowerCase()
          .includes(texto);
      return coincideCliente && coincideTexto;
    });
  });

  protected readonly formulario = this.fb.nonNullable.group({
    clienteId: [0, [Validators.required, Validators.min(1)]],
    placa: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{3}-[0-9]{3}$/)]],
    marca: ['', [Validators.required, Validators.maxLength(60)]],
    modelo: ['', [Validators.required, Validators.maxLength(80)]],
    anio: [2020, [Validators.required, Validators.min(1900), Validators.max(2100)]],
    tipoCombustible: ['GASOLINA' as TipoCombustible, [Validators.required]],
    vinMotor: ['', [Validators.maxLength(60)]],
    color: ['', [Validators.maxLength(40)]],
    kilometrajeActual: [0, [Validators.required, Validators.min(0), Validators.max(10000000), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      clientes: this.taller.clientes(),
      vehiculos: this.taller.vehiculos(),
    }).subscribe({
      next: ({ clientes, vehiculos }) => {
        this.clientes.set(clientes);
        this.vehiculos.set(vehiculos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los vehiculos.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formulario.reset({
      clienteId: this.clientes()[0]?.id ?? 0,
      placa: '',
      marca: '',
      modelo: '',
      anio: new Date().getFullYear(),
      tipoCombustible: 'GASOLINA',
      vinMotor: '',
      color: '',
      kilometrajeActual: 0,
    });
    this.errorModal.set(null);
    this.modalAbierto.set(true);
  }

  protected abrirEditar(vehiculo: Vehiculo): void {
    this.editando.set(vehiculo);
    this.formulario.reset({
      clienteId: vehiculo.cliente.id,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      tipoCombustible: vehiculo.tipoCombustible,
      vinMotor: vehiculo.vinMotor ?? '',
      color: vehiculo.color ?? '',
      kilometrajeActual: vehiculo.kilometrajeActual,
    });
    this.errorModal.set(null);
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editando.set(null);
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos = {
      cliente: { id: Number(valores.clienteId) },
      placa: valores.placa.trim().toUpperCase(),
      marca: valores.marca.trim(),
      modelo: valores.modelo.trim(),
      anio: Number(valores.anio),
      tipoCombustible: valores.tipoCombustible,
      vinMotor: valores.vinMotor?.trim() || undefined,
      color: valores.color?.trim() || undefined,
      kilometrajeActual: Number(valores.kilometrajeActual),
    };

    this.errorModal.set(null);
    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.taller.actualizarVehiculo(actual.id, datos)
      : this.taller.crearVehiculo(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.aviso.set(actual ? 'Vehiculo actualizado.' : 'Vehiculo registrado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorModal.set(mensajeDeFormulario(respuesta, 'No se pudo guardar el vehiculo.'));
      },
    });
  }

  protected eliminar(vehiculo: Vehiculo): void {
    if (!confirm(`Eliminar el vehiculo ${vehiculo.placa}?`)) {
      return;
    }
    this.taller.eliminarVehiculo(vehiculo.id).subscribe({
      next: () => {
        this.aviso.set('Vehiculo eliminado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el vehiculo.');
      },
    });
  }
}
