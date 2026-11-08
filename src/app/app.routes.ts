import { Routes } from '@angular/router';

import { LayoutComponent } from './components/layout/layout.component';
import { authGuard, loginGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Ingresar | Taller Mecanico',
    canActivate: [loginGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | Taller Mecanico',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientes',
        title: 'Clientes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
      },
      {
        path: 'vehiculos',
        title: 'Vehiculos | Taller Mecanico',
        loadComponent: () =>
          import('./pages/vehiculos/vehiculos.component').then((m) => m.VehiculosComponent),
      },
      {
        path: 'citas',
        title: 'Citas | Taller Mecanico',
        loadComponent: () => import('./pages/citas/citas.component').then((m) => m.CitasComponent),
      },
      {
        path: 'ordenes',
        title: 'Ordenes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/ordenes/ordenes.component').then((m) => m.OrdenesComponent),
      },
      {
        path: 'ordenes/:id',
        title: 'Detalle de orden | Taller Mecanico',
        loadComponent: () =>
          import('./pages/orden-detalle/orden-detalle.component').then(
            (m) => m.OrdenDetalleComponent,
          ),
      },
      {
        path: 'mecanicos',
        title: 'Mecanicos | Taller Mecanico',
        loadComponent: () =>
          import('./pages/mecanicos/mecanicos.component').then((m) => m.MecanicosComponent),
      },
      {
        path: 'paquetes',
        title: 'Paquetes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/paquetes/paquetes.component').then((m) => m.PaquetesComponent),
      },
      {
        path: 'insumos',
        title: 'Inventario | Taller Mecanico',
        loadComponent: () =>
          import('./pages/insumos/insumos.component').then((m) => m.InsumosComponent),
      },
      {
        path: 'reportes',
        title: 'Reportes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
