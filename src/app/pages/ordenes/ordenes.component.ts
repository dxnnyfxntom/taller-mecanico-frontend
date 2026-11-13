import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { Router, RouterLink } from '@angular/router';

import { EstadoInforme, InformeResumen, Mecanico, NivelCombustible, Paquete, Vehiculo } from '../../models/api.models';
import { AuthService } from '../../services/auth.service';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-ordenes',
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss',
})
export class OrdenesComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly taller = inject(TallerService);

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly modalOrden = signal(false);
  protected readonly guardandoOrden = signal(false);
  protected readonly errorOrden = signal<string | null>(null);
  protected readonly vehiculos = signal<Vehiculo[]>([]);
  protected readonly paquetes = signal<Paquete[]>([]);
  protected readonly mecanicos = signal<Mecanico[]>([]);
  protected readonly niveles: NivelCombustible[] = ['RESERVA', 'CUARTO', 'MEDIO', 'TRES_CUARTOS', 'LLENO'];
  protected readonly formularioOrden = this.fb.nonNullable.group({
    vehiculoId: [0, Validators.min(1)],
    paqueteId: [0, Validators.min(1)],
    mecanicoId: [0, Validators.min(1)],
    kilometrajeIngreso: [0, [Validators.required, Validators.min(0), Validators.max(10000000), Validators.pattern(/^\d+$/)]],
    nivelCombustible: ['MEDIO' as NivelCombustible, Validators.required],
    inventarioRecepcion: ['', Validators.maxLength(2000)],
    observacionesRecepcion: ['', Validators.maxLength(2000)],
  });

  protected readonly ordenes = signal<InformeResumen[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<'' | EstadoInforme>('');

  protected readonly estados: EstadoInforme[] = [
    'RECEPCIONADO',
    'EN_PROCESO',
    'LISTO_PARA_ENTREGA',
    'ENTREGADO',
    'CANCELADO',
  ];

  protected readonly filtradas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.ordenes().filter((orden) => {
      const coincideEstado = !estado || orden.estado === estado;
      const coincideTexto =
        !texto ||
        [orden.numeroOrden, orden.clienteNombre, orden.placa, orden.marcaModelo, orden.paqueteNombre]
          .join(' ')
          .toLowerCase()
          .includes(texto);
      return coincideEstado && coincideTexto;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.informes().subscribe({
      next: (ordenes) => {
        this.ordenes.set(ordenes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las ordenes de trabajo.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirOrden(): void {
    this.formularioOrden.reset();
    this.errorOrden.set(null);
    this.modalOrden.set(true);
    forkJoin({
      vehiculos: this.taller.vehiculos(),
      paquetes: this.taller.paquetes(true),
      mecanicos: this.taller.mecanicos(true),
    }).subscribe({
      next: ({ vehiculos, paquetes, mecanicos }) => {
        this.vehiculos.set(vehiculos);
        this.paquetes.set(paquetes);
        this.mecanicos.set(mecanicos);
      },
      error: () => this.errorOrden.set('No se pudieron cargar los datos para registrar la orden.'),
    });
  }

  protected seleccionarVehiculo(id: number): void {
    const vehiculo = this.vehiculos().find(v => v.id === id);
    if (vehiculo) this.formularioOrden.controls.kilometrajeIngreso.setValue(vehiculo.kilometrajeActual);
  }

  protected crearOrden(): void {
    if (this.guardandoOrden() || this.formularioOrden.invalid) return;
    this.guardandoOrden.set(true);
    this.errorOrden.set(null);
    this.taller.crearInforme(this.formularioOrden.getRawValue()).subscribe({
      next: (orden) => {
        this.guardandoOrden.set(false);
        this.modalOrden.set(false);
        void this.router.navigate(['/ordenes', orden.id]);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardandoOrden.set(false);
        this.errorOrden.set(respuesta.error?.mensaje ?? 'No se pudo registrar la orden.');
      },
    });
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }
}
