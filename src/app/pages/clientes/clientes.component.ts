import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Cliente } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-clientes',
  imports: [ReactiveFormsModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);

  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly errorModal = signal<string | null>(null);
  protected readonly camposInvalidos = signal<Record<string, string>>({});
  protected readonly busqueda = signal('');
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<Cliente | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) {
      return this.clientes();
    }
    return this.clientes().filter((cliente) =>
      [cliente.nombreCompleto, cliente.dniRuc, cliente.telefonoWhatsapp, cliente.correo ?? '']
        .join(' ')
        .toLowerCase()
        .includes(texto),
    );
  });

  protected readonly formulario = this.fb.nonNullable.group({
    dniRuc: ['', [Validators.required, Validators.pattern(/^(?:[0-9]{8}|[0-9]{11})$/)]],
    nombreCompleto: [
      '',
      [Validators.required, Validators.maxLength(150), Validators.pattern(/^(?:\P{L}*\p{L}){10}/u)],
    ],
    telefonoWhatsapp: ['', [Validators.required, Validators.pattern(/^(?:\+?51)?9[0-9]{8}$/)]],
    correo: ['', [Validators.email, Validators.maxLength(120)]],
    direccion: ['', [Validators.maxLength(200)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.clientes().subscribe({
      next: (clientes) => {
        this.clientes.set(clientes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de clientes.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formulario.reset({
      dniRuc: '',
      nombreCompleto: '',
      telefonoWhatsapp: '',
      correo: '',
      direccion: '',
    });
    this.errorModal.set(null);
    this.camposInvalidos.set({});
    this.modalAbierto.set(true);
  }

  protected abrirEditar(cliente: Cliente): void {
    this.editando.set(cliente);
    this.formulario.reset({
      dniRuc: cliente.dniRuc,
      nombreCompleto: cliente.nombreCompleto,
      telefonoWhatsapp: cliente.telefonoWhatsapp,
      correo: cliente.correo ?? '',
      direccion: cliente.direccion ?? '',
    });
    this.errorModal.set(null);
    this.camposInvalidos.set({});
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

    this.guardando.set(true);
    this.errorModal.set(null);
    this.camposInvalidos.set({});
    const datos = this.formulario.getRawValue();
    const actual = this.editando();

    const peticion = actual
      ? this.taller.actualizarCliente(actual.id, datos)
      : this.taller.crearCliente(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.aviso.set(actual ? 'Cliente actualizado.' : 'Cliente registrado.');
        this.ocultarAviso();
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        const mensaje = respuesta.error?.mensaje ?? 'No se pudo guardar el cliente.';
        const campos = respuesta.error?.campos ?? {};
        if (mensaje.includes('DNI/RUC')) campos.dniRuc = mensaje;
        this.camposInvalidos.set(campos);
        this.errorModal.set(mensaje);
      },
    });
  }

  protected eliminar(cliente: Cliente): void {
    if (!confirm(`Eliminar a ${cliente.nombreCompleto}? Esta accion no se puede deshacer.`)) {
      return;
    }
    this.taller.eliminarCliente(cliente.id).subscribe({
      next: () => {
        this.aviso.set('Cliente eliminado.');
        this.ocultarAviso();
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el cliente.');
      },
    });
  }

  private ocultarAviso(): void {
    setTimeout(() => this.aviso.set(null), 3500);
  }
}
