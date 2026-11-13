import { Routes } from '@angular/router';

import { LayoutComponent } from './components/layout/layout.component';
import { adminGuard, authGuard, loginGuard, recepcionGuard } from './services/auth.guard';

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
        canActivate: [recepcionGuard],
        title: 'Dashboard | Taller Mecanico',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientes',
        canActivate: [recepcionGuard],
        title: 'Clientes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
      },
      {
        path: 'vehiculos',
        canActivate: [recepcionGuard],
        title: 'Vehiculos | Taller Mecanico',
        loadComponent: () =>
          import('./pages/vehiculos/vehiculos.component').then((m) => m.VehiculosComponent),
      },
      {
        path: 'citas',
        canActivate: [recepcionGuard],
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
        canActivate: [adminGuard],
        title: 'Mecanicos | Taller Mecanico',
        loadComponent: () =>
          import('./pages/mecanicos/mecanicos.component').then((m) => m.MecanicosComponent),
      },
      {
        path: 'paquetes',
        canActivate: [adminGuard],
        title: 'Paquetes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/paquetes/paquetes.component').then((m) => m.PaquetesComponent),
      },
      {
        path: 'insumos',
        canActivate: [adminGuard],
        title: 'Inventario | Taller Mecanico',
        loadComponent: () =>
          import('./pages/insumos/insumos.component').then((m) => m.InsumosComponent),
      },
      {
        path: 'reportes',
        canActivate: [recepcionGuard],
        title: 'Reportes | Taller Mecanico',
        loadComponent: () =>
          import('./pages/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
