import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EMPTY, catchError, startWith, switchMap } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { TallerService } from '../../services/taller.service';

interface GrupoNav {
  titulo: string;
  enlaces: {
    ruta: string;
    etiqueta: string;
    icono: string;
    indicador?: 'citas' | 'ordenes' | 'stock';
  }[];
}

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private readonly taller = inject(TallerService);

  protected readonly auth = inject(AuthService);
  protected readonly menuAbierto = signal(false);
  protected readonly indicadores = toSignal(
    this.taller.cambiosIndicadores.pipe(
      startWith(undefined),
      switchMap(() => this.taller.dashboard().pipe(catchError(() => EMPTY))),
    ),
  );

  protected readonly grupos: GrupoNav[] = [
    {
      titulo: 'Operación',
      enlaces: [
        {
          ruta: '/dashboard',
          etiqueta: 'Dashboard',
          icono: 'M3 20h18 M5 20v-7h4v7 M10 20V9h4v11 M15 20V4h4v16',
        },
        {
          ruta: '/citas',
          etiqueta: 'Citas',
          icono: 'M7 3v4 M17 3v4 M4 10h16 M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
          indicador: 'citas',
        },
        {
          ruta: '/ordenes',
          etiqueta: 'Órdenes de trabajo',
          icono: 'M8 4h10l3 3v10 M18 4v4h3 M5 7h9l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z M13 7v4h4 M7 14h7 M7 17h7',
          indicador: 'ordenes',
        },
        {
          ruta: '/clientes',
          etiqueta: 'Clientes',
          icono: 'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M3 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2Z M17 4a4 4 0 0 1 0 7 M19 15a4 4 0 0 1 2 4v2',
        },
        {
          ruta: '/vehiculos',
          etiqueta: 'Vehículos',
          icono: 'm5 11 2-5h10l2 5 M5 17v3 M19 17v3 M7 14h1 M16 14h1 M3 17v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4Z',
        },
      ],
    },
    {
      titulo: 'Catálogos',
      enlaces: [
        {
          ruta: '/mecanicos',
          etiqueta: 'Mecánicos',
          icono: 'M13 8a5 5 0 0 1 6-5l-3 3 2 2 3-3a5 5 0 0 1-6 6L7 20a2 2 0 1 1-3-3l9-8Z M14 15l4 5a2 2 0 0 0 3-3l-4-4',
        },
        {
          ruta: '/paquetes',
          etiqueta: 'Paquetes',
          icono: 'M4 4h16v4H4Z M6 8v12h12V8 M10 12h4',
        },
        {
          ruta: '/insumos',
          etiqueta: 'Inventario',
          icono: 'M4 4h6v6H4Z M14 4h6v6h-6Z M4 14h6v6H4Z M14 14h6v6h-6Z',
          indicador: 'stock',
        },
        {
          ruta: '/reportes',
          etiqueta: 'Reportes',
          icono: 'M11 4a8 8 0 1 0 9 9h-9Z M14 2v8h8a8 8 0 0 0-8-8Z',
        },
      ],
    },
  ];

  protected readonly iniciales = computed(() => {
    const nombre = this.auth.usuario()?.nombreCompleto ?? 'Usuario';
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join('');
  });

  protected readonly hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
