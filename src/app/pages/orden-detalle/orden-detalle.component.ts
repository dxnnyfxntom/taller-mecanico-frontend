import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  Adicional,
  ChecklistItem,
  Consumo,
  EstadoInforme,
  InformeDetalle,
  Insumo,
  MedioPago,
  Pago,
  TipoAdicional,
  TipoPago,
} from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-orden-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule],
  templateUrl: './orden-detalle.component.html',
  styleUrl: './orden-detalle.component.scss',
})
export class OrdenDetalleComponent implements OnInit {
  private readonly taller = inject(TallerService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly id = Number(this.ruta.snapshot.paramMap.get('id'));
  protected readonly informe = signal<InformeDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly insumos = signal<Insumo[]>([]);

  protected readonly modalConsumo = signal(false);
  protected readonly guardandoConsumo = signal(false);
  protected readonly errorConsumo = signal<string | null>(null);

  protected readonly modalAdicional = signal(false);
  protected readonly guardandoAdicional = signal(false);
  protected readonly errorAdicional = signal<string | null>(null);
  protected readonly adicionalEditando = signal<Adicional | null>(null);

  protected readonly modalPago = signal(false);
  protected readonly guardandoPago = signal(false);
  protected readonly errorPago = signal<string | null>(null);

  protected readonly modalEscaneo = signal(false);
  protected readonly guardandoEscaneo = signal(false);
  protected readonly errorEscaneo = signal<string | null>(null);
  protected readonly continuarTrasEscaneo = signal(false);

  protected readonly completados = computed(
    () =>
      this.informe()?.checklist.filter((item) => item.accionRealizada === 'COMPLETADO').length ?? 0,
  );

  protected readonly totalItems = computed(() => this.informe()?.checklist.length ?? 0);

  protected readonly progreso = computed(() => {
    const total = this.totalItems();
    return total === 0 ? 0 : Math.round((this.completados() / total) * 100);
  });

  protected readonly editable = computed(() => {
    const estado = this.informe()?.estado;
    return estado !== 'ENTREGADO' && estado !== 'CANCELADO';
  });

  protected readonly saldoPendiente = computed(() => this.informe()?.totales.saldoPendiente ?? 0);

  protected readonly tiposAdicional: { valor: TipoAdicional; etiqueta: string }[] = [
    { valor: 'REPUESTO', etiqueta: 'Repuesto' },
    { valor: 'MANO_OBRA', etiqueta: 'Mano de obra' },
  ];

  protected readonly tiposPago: { valor: TipoPago; etiqueta: string }[] = [
    { valor: 'ADELANTO', etiqueta: 'Adelanto' },
    { valor: 'LIQUIDACION', etiqueta: 'Liquidacion' },
  ];

  protected readonly mediosPago: { valor: MedioPago; etiqueta: string }[] = [
    { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
    { valor: 'YAPE_PLIN', etiqueta: 'Yape / Plin' },
    { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
    { valor: 'TARJETA', etiqueta: 'Tarjeta' },
  ];

  protected readonly formularioConsumo = this.fb.nonNullable.group({
    insumoId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  protected readonly formularioAdicional = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.maxLength(300)]],
    tipo: ['REPUESTO' as TipoAdicional, [Validators.required]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    precioUnitario: [0, [Validators.required, Validators.min(0)]],
    aprobadoPorCliente: [false],
    cobraArandela: [true],
  });

  protected readonly formularioPago = this.fb.nonNullable.group({
    monto: [0, [Validators.required, Validators.min(0.01)]],
    tipoPago: ['ADELANTO' as TipoPago, [Validators.required]],
    medioPago: ['EFECTIVO' as MedioPago, [Validators.required]],
    referencia: ['', [Validators.maxLength(100)]],
  });

  protected readonly formularioEscaneo = this.fb.nonNullable.group({
    escaneoInicialResultado: ['', [Validators.maxLength(10000)]],
    escaneoFinalResultado: ['', [Validators.maxLength(10000)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.obtenerInforme(this.id).subscribe({
      next: (informe) => {
        this.informe.set(informe);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la orden de trabajo.');
        this.cargando.set(false);
      },
    });
  }

  private refrescar(): void {
    this.taller.obtenerInforme(this.id).subscribe({
      next: (informe) => this.informe.set(informe),
      error: () => this.error.set('No se pudo actualizar la orden de trabajo.'),
    });
  }

  protected siguienteEstado(): EstadoInforme | null {
    switch (this.informe()?.estado) {
      case 'RECEPCIONADO':
        return 'EN_PROCESO';
      case 'EN_PROCESO':
        return 'LISTO_PARA_ENTREGA';
      case 'LISTO_PARA_ENTREGA':
        return 'ENTREGADO';
      default:
        return null;
    }
  }

  protected avanzar(): void {
    const siguiente = this.siguienteEstado();
    if (!siguiente) {
      return;
    }

    if (
      siguiente === 'LISTO_PARA_ENTREGA' &&
      !this.informe()?.escaneoFinalResultado?.trim()
    ) {
      this.abrirEscaneo(true);
      return;
    }

    if (
      siguiente === 'ENTREGADO' &&
      !confirm('Registrar la entrega del vehiculo? La orden quedara cerrada.')
    ) {
      return;
    }

    this.aplicarEstado(siguiente);
  }

  private aplicarEstado(siguiente: EstadoInforme): void {
    this.procesando.set(true);
    this.error.set(null);
    this.taller.cambiarEstadoInforme(this.id, siguiente).subscribe({
      next: (actualizado) => {
        this.procesando.set(false);
        this.informe.set(actualizado);
        this.mostrarAviso(`Estado actualizado a ${siguiente.replaceAll('_', ' ')}.`);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo cambiar el estado.');
      },
    });
  }

  protected completar(item: ChecklistItem): void {
    this.procesando.set(true);
    this.taller
      .actualizarChecklist(this.id, item.id, {
        estadoComponente: item.estadoComponente || 'OPTIMO',
        accionRealizada: 'COMPLETADO',
        valorMedido: item.valorMedido || 'OK',
        observacionTecnica: item.observacionTecnica || 'Completado desde el panel',
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.refrescar();
        },
        error: (respuesta: HttpErrorResponse) => {
          this.procesando.set(false);
          this.error.set(respuesta.error?.mensaje ?? 'No se pudo actualizar el checklist.');
        },
      });
  }

  // ---------- Consumos ----------

  protected abrirConsumo(): void {
    this.errorConsumo.set(null);

    if (this.insumos().length === 0) {
      this.taller.insumos().subscribe({
        next: (insumos) => {
          this.insumos.set(insumos);
          this.prepararFormularioConsumo();
        },
        error: () => this.errorConsumo.set('No se pudo cargar el catalogo de insumos.'),
      });
    } else {
      this.prepararFormularioConsumo();
    }

    this.modalConsumo.set(true);
  }

  private prepararFormularioConsumo(): void {
    const primero = this.insumos().find((insumo) => insumo.stockActual > 0);
    this.formularioConsumo.reset({ insumoId: primero?.id ?? 0, cantidad: 1 });
  }

  protected cerrarConsumo(): void {
    if (!this.guardandoConsumo()) {
      this.modalConsumo.set(false);
    }
  }

  protected registrarConsumo(): void {
    if (this.formularioConsumo.invalid) {
      this.formularioConsumo.markAllAsTouched();
      return;
    }

    const valores = this.formularioConsumo.getRawValue();
    const insumo = this.insumos().find((item) => item.id === Number(valores.insumoId));
    if (!insumo) {
      this.errorConsumo.set('Seleccione un insumo valido.');
      return;
    }
    if (Number(valores.cantidad) > insumo.stockActual) {
      this.errorConsumo.set(
        `Stock insuficiente de "${insumo.nombre}". Disponible: ${insumo.stockActual}.`,
      );
      return;
    }

    this.errorConsumo.set(null);
    this.guardandoConsumo.set(true);
    this.taller.registrarConsumo(this.id, insumo.id, Number(valores.cantidad)).subscribe({
      next: () => {
        this.guardandoConsumo.set(false);
        this.modalConsumo.set(false);
        this.mostrarAviso('Consumo registrado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardandoConsumo.set(false);
        this.errorConsumo.set(respuesta.error?.mensaje ?? 'No se pudo registrar el consumo.');
      },
    });
  }

  protected eliminarConsumo(consumo: Consumo): void {
    if (!confirm(`Eliminar el consumo de "${consumo.nombre}"? El stock sera repuesto.`)) {
      return;
    }
    this.procesando.set(true);
    this.taller.eliminarConsumo(consumo.id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mostrarAviso('Consumo eliminado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el consumo.');
      },
    });
  }

  // ---------- Adicionales ----------

  protected abrirAdicional(adicional?: Adicional): void {
    this.errorAdicional.set(null);
    this.adicionalEditando.set(adicional ?? null);

    if (adicional) {
      this.formularioAdicional.reset({
        descripcion: adicional.descripcion,
        tipo: adicional.tipo,
        cantidad: adicional.cantidad,
        precioUnitario: adicional.precioUnitario,
        aprobadoPorCliente: adicional.aprobadoPorCliente,
        cobraArandela: adicional.cobraArandela,
      });
    } else {
      this.formularioAdicional.reset({
        descripcion: '',
        tipo: 'REPUESTO',
        cantidad: 1,
        precioUnitario: 0,
        aprobadoPorCliente: false,
        cobraArandela: true,
      });
    }

    this.modalAdicional.set(true);
  }

  protected cerrarAdicional(): void {
    if (!this.guardandoAdicional()) {
      this.modalAdicional.set(false);
    }
  }

  protected guardarAdicional(): void {
    if (this.formularioAdicional.invalid) {
      this.formularioAdicional.markAllAsTouched();
      return;
    }

    const valores = this.formularioAdicional.getRawValue();
    const datos = {
      descripcion: valores.descripcion.trim(),
      tipo: valores.tipo,
      cantidad: Number(valores.cantidad),
      precioUnitario: Number(valores.precioUnitario),
      aprobadoPorCliente: Boolean(valores.aprobadoPorCliente),
      cobraArandela: Boolean(valores.cobraArandela),
    };

    if (!datos.descripcion) {
      this.errorAdicional.set('La descripcion es obligatoria.');
      return;
    }

    const editando = this.adicionalEditando();
    this.errorAdicional.set(null);
    this.guardandoAdicional.set(true);

    const peticion = editando
      ? this.taller.actualizarAdicional(editando.id, datos)
      : this.taller.registrarAdicional(this.id, datos);

    peticion.subscribe({
      next: () => {
        this.guardandoAdicional.set(false);
        this.modalAdicional.set(false);
        this.mostrarAviso(editando ? 'Adicional actualizado.' : 'Adicional registrado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardandoAdicional.set(false);
        this.errorAdicional.set(respuesta.error?.mensaje ?? 'No se pudo guardar el adicional.');
      },
    });
  }

  protected cambiarAprobacion(adicional: Adicional, aprobado: boolean): void {
    this.procesando.set(true);
    this.taller.cambiarAprobacionAdicional(adicional.id, aprobado).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mostrarAviso(aprobado ? 'Adicional aprobado.' : 'Adicional rechazado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo cambiar la aprobacion.');
      },
    });
  }

  protected eliminarAdicional(adicional: Adicional): void {
    if (!confirm(`Eliminar el adicional "${adicional.descripcion}"?`)) {
      return;
    }
    this.procesando.set(true);
    this.taller.eliminarAdicional(adicional.id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mostrarAviso('Adicional eliminado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el adicional.');
      },
    });
  }

  // ---------- Pagos ----------

  protected abrirPago(): void {
    this.errorPago.set(null);
    const saldo = this.saldoPendiente();
    this.formularioPago.reset({
      monto: saldo > 0 ? saldo : 0,
      tipoPago: 'ADELANTO',
      medioPago: 'EFECTIVO',
      referencia: '',
    });
    this.modalPago.set(true);
  }

  protected cerrarPago(): void {
    if (!this.guardandoPago()) {
      this.modalPago.set(false);
    }
  }

  protected registrarPago(): void {
    if (this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched();
      return;
    }

    const valores = this.formularioPago.getRawValue();
    const monto = Number(valores.monto);
    const saldo = this.saldoPendiente();
    if (monto > saldo) {
      this.errorPago.set(`El monto excede el saldo pendiente de S/ ${saldo.toFixed(2)}.`);
      return;
    }

    this.errorPago.set(null);
    this.guardandoPago.set(true);
    this.taller
      .registrarPago(this.id, {
        monto,
        tipoPago: valores.tipoPago,
        medioPago: valores.medioPago,
        referencia: valores.referencia.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.guardandoPago.set(false);
          this.modalPago.set(false);
          this.mostrarAviso('Pago registrado.');
          this.refrescar();
        },
        error: (respuesta: HttpErrorResponse) => {
          this.guardandoPago.set(false);
          this.errorPago.set(respuesta.error?.mensaje ?? 'No se pudo registrar el pago.');
        },
      });
  }

  protected eliminarPago(pago: Pago): void {
    if (!confirm(`Anular el pago de S/ ${pago.monto.toFixed(2)}?`)) {
      return;
    }
    this.procesando.set(true);
    this.taller.eliminarPago(pago.id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mostrarAviso('Pago anulado.');
        this.refrescar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo anular el pago.');
      },
    });
  }

  // ---------- Escaneos ----------

  protected abrirEscaneo(continuar = false): void {
    const actual = this.informe();
    this.errorEscaneo.set(null);
    this.continuarTrasEscaneo.set(continuar);
    this.formularioEscaneo.reset({
      escaneoInicialResultado: actual?.escaneoInicialResultado ?? '',
      escaneoFinalResultado: actual?.escaneoFinalResultado ?? '',
    });
    this.modalEscaneo.set(true);
  }

  protected cerrarEscaneo(): void {
    if (!this.guardandoEscaneo()) {
      this.modalEscaneo.set(false);
      this.continuarTrasEscaneo.set(false);
    }
  }

  protected guardarEscaneo(): void {
    if (this.formularioEscaneo.invalid) {
      this.formularioEscaneo.markAllAsTouched();
      return;
    }

    const valores = this.formularioEscaneo.getRawValue();
    const inicial = valores.escaneoInicialResultado.trim();
    const final = valores.escaneoFinalResultado.trim();

    if (!inicial && !final) {
      this.errorEscaneo.set('Registre al menos el resultado de un escaneo.');
      return;
    }
    if (this.continuarTrasEscaneo() && !final) {
      this.errorEscaneo.set(
        'El escaneo final es obligatorio para pasar la orden a LISTO PARA ENTREGA.',
      );
      return;
    }

    const continuar = this.continuarTrasEscaneo();
    this.errorEscaneo.set(null);
    this.guardandoEscaneo.set(true);

    this.taller
      .actualizarEscaneos(this.id, {
        escaneoInicialResultado: inicial || undefined,
        escaneoFinalResultado: final || undefined,
      })
      .subscribe({
        next: (actualizado) => {
          this.guardandoEscaneo.set(false);
          this.modalEscaneo.set(false);
          this.continuarTrasEscaneo.set(false);
          this.informe.set(actualizado);
          this.mostrarAviso('Escaneos actualizados.');

          if (continuar) {
            this.aplicarEstado('LISTO_PARA_ENTREGA');
          }
        },
        error: (respuesta: HttpErrorResponse) => {
          this.guardandoEscaneo.set(false);
          this.errorEscaneo.set(respuesta.error?.mensaje ?? 'No se pudieron guardar los escaneos.');
        },
      });
  }

  // ---------- Utilidades ----------

  private mostrarAviso(mensaje: string): void {
    this.aviso.set(mensaje);
    setTimeout(() => this.aviso.set(null), 3500);
  }

  protected claseEstado(estado: string): string {
    return `badge badge--${estado.toLowerCase()}`;
  }
}
