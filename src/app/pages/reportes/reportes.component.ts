import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  HistorialPlaca,
  ProductividadMecanico,
  Recordatorio,
} from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

type Pestana = 'historial' | 'recordatorios' | 'productividad';

@Component({
  selector: 'app-reportes',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly taller = inject(TallerService);

  protected readonly pestana = signal<Pestana>('historial');
  protected readonly dias = signal(30);

  protected readonly formulario = this.fb.nonNullable.group({
    placa: ['', [Validators.required, Validators.maxLength(10)]],
  });

  protected readonly historial = signal<HistorialPlaca | null>(null);
  protected readonly buscando = signal(false);
  protected readonly errorHistorial = signal<string | null>(null);
  protected readonly busco = signal(false);

  protected readonly recordatorios = signal<Recordatorio[]>([]);
  protected readonly cargandoRecordatorios = signal(false);
  protected readonly errorRecordatorios = signal<string | null>(null);

  protected readonly productividad = signal<ProductividadMecanico[]>([]);
  protected readonly cargandoProductividad = signal(false);
  protected readonly errorProductividad = signal<string | null>(null);

  protected readonly totalOrdenes = computed(() =>
    this.productividad().reduce((total, item) => total + item.totalOrdenes, 0),
  );

  protected readonly totalFacturado = computed(() =>
    this.productividad().reduce((total, item) => total + item.totalFacturado, 0),
  );

  ngOnInit(): void {
    this.cargarRecordatorios();
    this.cargarProductividad();
  }

  protected cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  protected buscarHistorial(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const placa = this.formulario.controls.placa.value.trim().toUpperCase();
    this.buscando.set(true);
    this.busco.set(true);
    this.errorHistorial.set(null);
    this.historial.set(null);

    this.taller.historial(placa).subscribe({
      next: (historial) => {
        this.historial.set(historial);
        this.buscando.set(false);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.buscando.set(false);
        this.errorHistorial.set(
          respuesta.status === 404
            ? `No se encontro historial para la placa ${placa}.`
            : (respuesta.error?.mensaje ?? 'No se pudo consultar el historial.'),
        );
      },
    });
  }

  protected cargarRecordatorios(): void {
    this.cargandoRecordatorios.set(true);
    this.errorRecordatorios.set(null);
    this.taller.recordatorios(this.dias()).subscribe({
      next: (recordatorios) => {
        this.recordatorios.set(recordatorios);
        this.cargandoRecordatorios.set(false);
      },
      error: () => {
        this.errorRecordatorios.set('No se pudieron cargar los recordatorios.');
        this.cargandoRecordatorios.set(false);
      },
    });
  }

  protected seleccionarDias(valor: string): void {
    this.dias.set(Number(valor));
    this.cargarRecordatorios();
  }

  protected cargarProductividad(): void {
    this.cargandoProductividad.set(true);
    this.errorProductividad.set(null);
    this.taller.productividad().subscribe({
      next: (productividad) => {
        this.productividad.set(productividad);
        this.cargandoProductividad.set(false);
      },
      error: () => {
        this.errorProductividad.set('No se pudo cargar la productividad del equipo.');
        this.cargandoProductividad.set(false);
      },
    });
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }

  protected claseAlerta(estado: string): string {
    switch (estado) {
      case 'CRITICO':
      case 'VENCIDO':
        return 'badge badge--cancelado';
      case 'PROXIMO':
        return 'badge badge--en_proceso';
      default:
        return 'badge badge--recepcionado';
    }
  }

  protected porcentajeEntregadas(item: ProductividadMecanico): number {
    return item.totalOrdenes === 0
      ? 0
      : Math.round((item.ordenesEntregadas / item.totalOrdenes) * 100);
  }
}
