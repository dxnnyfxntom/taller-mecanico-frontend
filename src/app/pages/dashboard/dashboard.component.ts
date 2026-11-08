import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Dashboard } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly taller = inject(TallerService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly datos = signal<Dashboard | null>(null);

  protected readonly maxEstado = computed(() => {
    const valores = this.datos()?.ordenesPorEstado.map((item) => item.total) ?? [1];
    return Math.max(1, ...valores);
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.dashboard().subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los indicadores. Verifique que el backend este activo.');
        this.cargando.set(false);
      },
    });
  }

  protected porcentaje(total: number): string {
    return `${Math.round((total / this.maxEstado()) * 100)}%`;
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }
}
