import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EstadoInforme, InformeResumen } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-ordenes',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss',
})
export class OrdenesComponent implements OnInit {
  private readonly taller = inject(TallerService);

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

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }
}
