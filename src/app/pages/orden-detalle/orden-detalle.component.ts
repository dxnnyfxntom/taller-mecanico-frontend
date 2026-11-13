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
  Evidencia,
  Mecanico,
  NivelCombustible,
  InformeDetalle,
  Insumo,
  MedioPago,
  Pago,
  TipoAdicional,
  TipoPago,
} from '../../models/api.models';
import { ImagenEvidenciaComponent } from '../../components/imagen-evidencia/imagen-evidencia.component';
import { AuthService } from '../../services/auth.service';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-orden-detalle',
  imports: [RouterLink, DatePipe, DecimalPipe, ReactiveFormsModule, ImagenEvidenciaComponent],
  templateUrl: './orden-detalle.component.html',
  styleUrl: './orden-detalle.component.scss',
})
export class OrdenDetalleComponent implements OnInit {
  protected readonly auth = inject(AuthService);
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
  private claveConsumo = '';
  private clavePago = '';

  protected readonly itemChecklist = signal<ChecklistItem | null>(null);
  protected readonly errorChecklist = signal<string | null>(null);
  protected readonly formularioChecklist = this.fb.nonNullable.group({
    accionRealizada: ['', Validators.required],
    estadoComponente: [''],
    valorMedido: ['', Validators.maxLength(250)],
    observacionTecnica: ['', Validators.maxLength(10000)],
  });
  protected readonly accionesCondicionales = [
    'SOLO_VERIFICADO', 'RELLENADO', 'CAMBIADO', 'CALIBRADO', 'NO_REQUERIDO',
  ];

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

  protected readonly etapasEvidencia = ['INGRESO', 'DIAGNOSTICO', 'REPARACION', 'ENTREGA'];
  protected readonly niveles: NivelCombustible[] = ['RESERVA', 'CUARTO', 'MEDIO', 'TRES_CUARTOS', 'LLENO'];
  protected readonly mecanicos = signal<Mecanico[]>([]);
  protected readonly modalRecepcion = signal(false);
  protected readonly errorRecepcion = signal<string | null>(null);
  protected readonly guardandoArchivo = signal(false);
  protected readonly formularioEvidencia = this.fb.nonNullable.group({
    etapa: ['INGRESO'],
    descripcion: ['', Validators.maxLength(300)],
  });
  protected readonly formularioRecepcion = this.fb.nonNullable.group({
    mecanicoId: [0, Validators.min(1)],
    kilometrajeIngreso: [0, [Validators.required, Validators.min(0), Validators.max(10000000), Validators.pattern(/^\d+$/)]],
    nivelCombustible: ['MEDIO' as NivelCombustible, Validators.required],
    inventarioRecepcion: ['', Validators.maxLength(2000)],
    observacionesRecepcion: ['', Validators.maxLength(2000)],
    recomendacionesFuturas: ['', Validators.maxLength(10000)],
    observacionesGenerales: ['', Validators.maxLength(10000)],
  });

  protected readonly modalEscaneo = signal(false);
  protected readonly guardandoEscaneo = signal(false);
  protected readonly errorEscaneo = signal<string | null>(null);
  protected readonly continuarTrasEscaneo = signal(false);

  protected readonly completados = computed(
    () =>
      this.informe()?.checklist.filter((item) => this.resultadoRegistrado(item)).length ?? 0,
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
    if (this.auth.esMecanico()) return null;
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
      !confirm(this.saldoPendiente() > 0
        ? `¿Entregar el vehículo con S/ ${this.saldoPendiente().toFixed(2)} pendientes de cobro?`
        : '¿Registrar la entrega del vehículo?')
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

  protected accionesChecklist(item: ChecklistItem): string[] {
    return item.esCondicional && item.categoria !== 'CORTESIA'
      ? this.accionesCondicionales
      : ['COMPLETADO'];
  }

  protected resultadoRegistrado(item: ChecklistItem): boolean {
    return this.accionesChecklist(item).includes(item.accionRealizada ?? '')
      && (item.accionRealizada === 'NO_REQUERIDO' || !!item.estadoComponente);
  }

  protected abrirChecklist(item: ChecklistItem): void {
    this.errorChecklist.set(null);
    this.formularioChecklist.reset({
      accionRealizada: this.accionesChecklist(item).includes(item.accionRealizada ?? '')
        ? item.accionRealizada! : '',
      estadoComponente: item.estadoComponente ?? '',
      valorMedido: item.valorMedido ?? '',
      observacionTecnica: item.observacionTecnica ?? '',
    });
    this.itemChecklist.set(item);
  }

  protected cerrarChecklist(): void {
    if (!this.procesando()) this.itemChecklist.set(null);
  }

  protected guardarChecklist(item: ChecklistItem): void {
    if (this.procesando() || this.formularioChecklist.invalid) return;
    const datos = this.formularioChecklist.getRawValue();
    if (datos.accionRealizada !== 'NO_REQUERIDO' && !datos.estadoComponente) {
      this.errorChecklist.set('Selecciona el estado observado del componente.');
      return;
    }
    this.procesando.set(true);
    this.errorChecklist.set(null);
    this.taller.actualizarChecklist(this.id, item.id, {
      ...datos,
      estadoComponente: datos.accionRealizada === 'NO_REQUERIDO' ? undefined : datos.estadoComponente,
    }).subscribe({
      next: (actualizado) => {
        this.procesando.set(false);
        this.itemChecklist.set(null);
        this.informe.update((orden) => orden && {
          ...orden,
          checklist: orden.checklist.map((punto) => punto.id === actualizado.id ? actualizado : punto),
        });
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.errorChecklist.set(respuesta.error?.mensaje ?? 'No se pudo guardar el resultado.');
      },
    });
  }

  protected cancelarOrden(): void {
    if (confirm('¿Cancelar la orden y reponer los insumos consumidos?')) this.aplicarEstado('CANCELADO');
  }

  protected volverAProceso(): void {
    this.aplicarEstado('EN_PROCESO');
  }

  // ---------- Consumos ----------

  protected abrirConsumo(): void {
    this.errorConsumo.set(null);

    this.claveConsumo = crypto.randomUUID();
    this.insumos.set([]);
    this.formularioConsumo.reset({ insumoId: 0, cantidad: 1 });
    this.modalConsumo.set(true);
    this.taller.insumos().subscribe({
      next: (insumos) => {
        this.insumos.set(insumos);
        this.prepararFormularioConsumo();
      },
      error: () => this.errorConsumo.set('No se pudo cargar el catálogo de insumos.'),
    });
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
    if (this.guardandoConsumo() || this.formularioConsumo.invalid) {
      this.formularioConsumo.markAllAsTouched();
      return;
    }

    const valores = this.formularioConsumo.getRawValue();
    const insumo = this.insumos().find((item) => item.id === Number(valores.insumoId));
    if (!insumo) {
      this.errorConsumo.set('Seleccione un insumo valido.');
      return;
    }
    if (!Number.isInteger(valores.cantidad)) {
      this.errorConsumo.set('Ingrese una cantidad en unidades enteras.');
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
    this.taller.registrarConsumo(this.id, insumo.id, Number(valores.cantidad), this.claveConsumo).subscribe({
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
    this.clavePago = crypto.randomUUID();
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
    if (this.guardandoPago() || this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched();
      return;
    }

    const valores = this.formularioPago.getRawValue();
    const monto = Number(valores.monto);
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(monto))) {
      this.errorPago.set("Ingrese un monto con hasta dos decimales.");
      return;
    }
    const saldo = this.saldoPendiente();
    if (monto > saldo) {
      this.errorPago.set(`El monto excede el saldo pendiente de S/ ${saldo.toFixed(2)}.`);
      return;
    }

    this.errorPago.set(null);
    this.guardandoPago.set(true);
    this.taller
      .registrarPago(this.id, {
        claveOperacion: this.clavePago,
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

  protected abrirRecepcion(orden: InformeDetalle): void {
    this.errorRecepcion.set(null);
    this.formularioRecepcion.reset({
      mecanicoId: orden.mecanico.id,
      kilometrajeIngreso: orden.kilometrajeIngreso,
      nivelCombustible: orden.nivelCombustible,
      inventarioRecepcion: orden.inventarioRecepcion ?? '',
      observacionesRecepcion: orden.observacionesRecepcion ?? '',
      recomendacionesFuturas: orden.recomendacionesFuturas ?? '',
      observacionesGenerales: orden.observacionesGenerales ?? '',
    });
    this.mecanicos.set([orden.mecanico]);
    this.modalRecepcion.set(true);
    this.taller.mecanicos(true).subscribe({
      next: (mecanicos) => this.mecanicos.set(mecanicos.some(m => m.id === orden.mecanico.id)
        ? mecanicos : [orden.mecanico, ...mecanicos]),
      error: () => this.errorRecepcion.set('No se pudo cargar la lista de mecánicos.'),
    });
  }

  protected guardarRecepcion(): void {
    if (this.procesando() || this.formularioRecepcion.invalid) return;
    this.errorRecepcion.set(null);
    this.procesando.set(true);
    const datos = this.formularioRecepcion.getRawValue();
    this.taller.actualizarInforme(this.id, { ...datos, mecanicoId: Number(datos.mecanicoId) }).subscribe({
      next: (orden) => {
        this.procesando.set(false);
        this.informe.set(orden);
        this.modalRecepcion.set(false);
        this.mostrarAviso('Datos de recepción actualizados.');
      },
      error: (respuesta: HttpErrorResponse) => {
        this.procesando.set(false);
        this.errorRecepcion.set(respuesta.error?.mensaje ?? 'No se pudo actualizar la recepción.');
      },
    });
  }

  protected subirEvidencia(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (!archivo || this.formularioEvidencia.invalid || this.guardandoArchivo()) return;
    this.guardandoArchivo.set(true);
    this.error.set(null);
    const { etapa, descripcion } = this.formularioEvidencia.getRawValue();
    this.taller.subirEvidencia(this.id, archivo, etapa, descripcion.trim()).subscribe({
      next: (evidencia) => {
        this.guardandoArchivo.set(false);
        input.value = '';
        this.formularioEvidencia.controls.descripcion.reset();
        this.informe.update((orden) => orden && { ...orden, evidencias: [evidencia, ...orden.evidencias] });
        this.mostrarAviso('Evidencia guardada.');
      },
      error: (respuesta: HttpErrorResponse) => this.errorArchivo(respuesta),
    });
  }

  protected eliminarEvidencia(evidencia: Evidencia): void {
    if (this.guardandoArchivo() || !confirm('¿Eliminar esta evidencia?')) return;
    this.guardandoArchivo.set(true);
    this.taller.eliminarEvidencia(evidencia.id).subscribe({
      next: () => {
        this.guardandoArchivo.set(false);
        this.informe.update((orden) => orden && {
          ...orden, evidencias: orden.evidencias.filter(e => e.id !== evidencia.id),
        });
      },
      error: (respuesta: HttpErrorResponse) => this.errorArchivo(respuesta),
    });
  }

  protected subirFicha(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (!archivo || this.guardandoArchivo()) return;
    this.guardandoArchivo.set(true);
    this.error.set(null);
    this.taller.subirFichaTecnica(this.id, archivo).subscribe({
      next: (orden) => {
        this.guardandoArchivo.set(false);
        this.informe.set(orden);
        input.value = '';
        this.mostrarAviso('Ficha técnica guardada.');
      },
      error: (respuesta: HttpErrorResponse) => this.errorArchivo(respuesta),
    });
  }

  protected descargarFicha(ruta: string): void {
    this.taller.cargarArchivo(ruta).subscribe({
      next: (archivo) => this.taller.guardarDescarga(archivo, 'ficha-tecnica.pdf'),
      error: () => this.error.set('No se pudo descargar la ficha técnica.'),
    });
  }

  protected descargarInforme(): void {
    this.taller.reporte(this.id).subscribe({
      next: (informe) => this.taller.guardarDescarga(
        new Blob([JSON.stringify(informe, null, 2)], { type: 'application/json' }),
        (this.informe()?.numeroOrden ?? 'informe') + '.json',
      ),
      error: () => this.error.set('No se pudo descargar el informe.'),
    });
  }

  private errorArchivo(respuesta: HttpErrorResponse): void {
    this.guardandoArchivo.set(false);
    this.error.set(respuesta.error?.mensaje ?? 'No se pudo completar la operación con el archivo.');
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
