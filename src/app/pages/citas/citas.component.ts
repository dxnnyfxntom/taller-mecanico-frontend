import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Cita, Cliente, EstadoCita, Mecanico, NivelCombustible, Paquete, Vehiculo } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-citas',
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './citas.component.html',
  styleUrl: './citas.component.scss',
})
export class CitasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly citas = signal<Cita[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly paquetes = signal<Paquete[]>([]);
  protected readonly mecanicos = signal<Mecanico[]>([]);
  protected readonly vehiculosCliente = signal<Vehiculo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'' | EstadoCita>('');
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<string | null>(null);

  protected readonly modalConversion = signal(false);
  protected readonly citaAConvertir = signal<Cita | null>(null);
  protected readonly convirtiendo = signal(false);
  protected readonly errorConversion = signal<string | null>(null);

  protected readonly estados: EstadoCita[] = [
    'PENDIENTE',
    'CONFIRMADA',
    'EN_TALLER',
    'CANCELADA',
  ];

  protected readonly niveles: { valor: NivelCombustible; etiqueta: string }[] = [
    { valor: 'RESERVA', etiqueta: 'Reserva' },
    { valor: 'CUARTO', etiqueta: '1/4 tanque' },
    { valor: 'MEDIO', etiqueta: '1/2 tanque' },
    { valor: 'TRES_CUARTOS', etiqueta: '3/4 tanque' },
    { valor: 'LLENO', etiqueta: 'Tanque lleno' },
  ];

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.citas().filter((cita) => {
      const coincideEstado = !estado || cita.estadoCita === estado;
      const coincideTexto =
        !texto ||
        [cita.clienteNombre, cita.placa, cita.marcaModelo, cita.paqueteNombre]
          .join(' ')
          .toLowerCase()
          .includes(texto);
      return coincideEstado && coincideTexto;
    });
  });

  protected readonly formulario = this.fb.nonNullable.group({
    clienteId: [0, [Validators.required, Validators.min(1)]],
    vehiculoId: [0, [Validators.required, Validators.min(1)]],
    paqueteId: [0, [Validators.required, Validators.min(1)]],
    fechaHoraInicio: ['', [Validators.required]],
    observaciones: ['', [Validators.maxLength(1000)]],
  });

  protected readonly formularioConversion = this.fb.nonNullable.group({
    mecanicoId: [0, [Validators.required, Validators.min(1)]],
    kilometrajeIngreso: [0, [Validators.required, Validators.min(0)]],
    nivelCombustible: ['MEDIO' as NivelCombustible, [Validators.required]],
    inventarioRecepcion: ['', [Validators.maxLength(2000)]],
    observacionesRecepcion: ['', [Validators.maxLength(2000)]],
  });

  constructor() {
    this.formulario.controls.clienteId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clienteId) => {
        this.cargarVehiculosCliente(Number(clienteId));
      });
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      citas: this.taller.citas(),
      clientes: this.taller.clientes(),
      paquetes: this.taller.paquetes(),
      mecanicos: this.taller.mecanicos(true),
    }).subscribe({
      next: ({ citas, clientes, paquetes, mecanicos }) => {
        this.citas.set(citas);
        this.clientes.set(clientes);
        this.paquetes.set(paquetes.filter((paquete) => paquete.activo));
        this.mecanicos.set(mecanicos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las citas.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirNueva(): void {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(9, 0, 0, 0);
    const fechaLocal = this.aDatetimeLocal(manana);

    this.formulario.reset({
      clienteId: 0,
      vehiculoId: 0,
      paqueteId: this.paquetes()[0]?.id ?? 0,
      fechaHoraInicio: fechaLocal,
      observaciones: '',
    });
    this.vehiculosCliente.set([]);
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  protected abrirConversion(cita: Cita): void {
    this.citaAConvertir.set(cita);
    this.errorConversion.set(null);
    this.formularioConversion.reset({
      mecanicoId: this.mecanicos()[0]?.id ?? 0,
      kilometrajeIngreso: 0,
      nivelCombustible: 'MEDIO',
      inventarioRecepcion: '',
      observacionesRecepcion: '',
    });
    this.modalConversion.set(true);

    this.taller.vehiculos(cita.clienteId).subscribe({
      next: (vehiculos) => {
        const vehiculo = vehiculos.find((item) => item.id === cita.vehiculoId);
        if (vehiculo && this.formularioConversion.controls.kilometrajeIngreso.value === 0) {
          this.formularioConversion.controls.kilometrajeIngreso.setValue(vehiculo.kilometrajeActual);
        }
      },
      error: () => undefined,
    });
  }

  protected cerrarConversion(): void {
    if (!this.convirtiendo()) {
      this.modalConversion.set(false);
    }
  }

  protected convertir(): void {
    if (this.formularioConversion.invalid) {
      this.formularioConversion.markAllAsTouched();
      return;
    }

    const cita = this.citaAConvertir();
    if (!cita) {
      return;
    }

    const valores = this.formularioConversion.getRawValue();
    this.errorConversion.set(null);
    this.convirtiendo.set(true);

    this.taller
      .convertirCita(cita.id, {
        mecanicoId: Number(valores.mecanicoId),
        kilometrajeIngreso: Number(valores.kilometrajeIngreso),
        nivelCombustible: valores.nivelCombustible,
        inventarioRecepcion: valores.inventarioRecepcion.trim() || undefined,
        observacionesRecepcion: valores.observacionesRecepcion.trim() || undefined,
      })
      .subscribe({
        next: (informe) => {
          this.convirtiendo.set(false);
          this.modalConversion.set(false);
          this.aviso.set(`Orden ${informe.numeroOrden} creada.`);
          void this.router.navigate(['/ordenes', informe.id]);
        },
        error: (respuesta: HttpErrorResponse) => {
          this.convirtiendo.set(false);
          this.errorConversion.set(
            respuesta.error?.mensaje ?? 'No se pudo convertir la cita en una orden de trabajo.',
          );
        },
      });
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const fecha = valores.fechaHoraInicio.length === 16
      ? `${valores.fechaHoraInicio}:00`
      : valores.fechaHoraInicio;

    this.guardando.set(true);
    this.taller
      .crearCita({
        clienteId: Number(valores.clienteId),
        vehiculoId: Number(valores.vehiculoId),
        paqueteId: Number(valores.paqueteId),
        fechaHoraInicio: fecha,
        observaciones: valores.observaciones?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarModal();
          this.aviso.set('Cita registrada.');
          setTimeout(() => this.aviso.set(null), 3500);
          this.cargar();
        },
        error: (respuesta: HttpErrorResponse) => {
          this.guardando.set(false);
          this.error.set(respuesta.error?.mensaje ?? 'No se pudo registrar la cita.');
        },
      });
  }

  protected confirmar(cita: Cita): void {
    this.cambiarEstado(cita, 'CONFIRMADA');
  }

  protected cancelar(cita: Cita): void {
    if (!confirm(`Cancelar la cita de ${cita.clienteNombre}?`)) {
      return;
    }
    this.cambiarEstado(cita, 'CANCELADA');
  }

  protected eliminar(cita: Cita): void {
    if (!confirm('Eliminar esta cita?')) {
      return;
    }
    this.taller.eliminarCita(cita.id).subscribe({
      next: () => {
        this.aviso.set('Cita eliminada.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar la cita.');
      },
    });
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }

  private cambiarEstado(cita: Cita, estado: EstadoCita): void {
    this.taller.cambiarEstadoCita(cita.id, estado).subscribe({
      next: () => this.cargar(),
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo actualizar la cita.');
      },
    });
  }

  private cargarVehiculosCliente(clienteId: number): void {
    if (!clienteId) {
      this.vehiculosCliente.set([]);
      return;
    }
    this.taller.vehiculos(clienteId).subscribe({
      next: (vehiculos) => {
        this.vehiculosCliente.set(vehiculos);
        const actual = Number(this.formulario.controls.vehiculoId.value);
        if (!vehiculos.some((vehiculo) => vehiculo.id === actual)) {
          this.formulario.controls.vehiculoId.setValue(vehiculos[0]?.id ?? 0);
        }
      },
      error: () => this.vehiculosCliente.set([]),
    });
  }

  private aDatetimeLocal(fecha: Date): string {
    const pad = (valor: number) => String(valor).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(
      fecha.getHours(),
    )}:${pad(fecha.getMinutes())}`;
  }
}
