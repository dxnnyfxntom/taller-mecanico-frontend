import { HttpParams } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, share, tap } from 'rxjs';

import {
  Adicional,
  AdicionalPayload,
  CategoriaInsumo,
  Cita,
  ChecklistItem,
  Evidencia,
  NivelCombustible,
  CitaPayload,
  Cliente,
  ClientePayload,
  ConfiguracionTaller,
  Consumo,
  ConvertirCitaPayload,
  Dashboard,
  EscaneosPayload,
  EstadoCita,
  EstadoInforme,
  HistorialPlaca,
  InformeDetalle,
  InformeResumen,
  Insumo,
  InsumoPayload,
  Mecanico,
  MecanicoPayload,
  Paquete,
  PaquetePayload,
  Pago,
  PagoPayload,
  ProductividadMecanico,
  Recordatorio,
  Vehiculo,
  VehiculoPayload,
} from '../models/api.models';
import { API_URL, UPLOADS_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class TallerService {
  private readonly http = inject(HttpClient);
  private readonly dashboardEnCurso = this.http
    .get<Dashboard>(`${API_URL}/reportes/dashboard`)
    .pipe(share());
  private readonly indicadoresActualizados = new Subject<void>();
  readonly cambiosIndicadores = this.indicadoresActualizados.asObservable();

  // ---------- Dashboard y reportes ----------
  dashboard(): Observable<Dashboard> {
    return this.dashboardEnCurso;
  }

  private avisarCambioIndicadores<T>(peticion: Observable<T>): Observable<T> {
    return peticion.pipe(tap(() => this.indicadoresActualizados.next()));
  }

  historial(placa: string): Observable<HistorialPlaca> {
    return this.http.get<HistorialPlaca>(
      `${API_URL}/reportes/historial/${encodeURIComponent(placa)}`,
    );
  }

  recordatorios(dias?: number): Observable<Recordatorio[]> {
    const params = dias ? new HttpParams().set('dias', dias) : undefined;
    return this.http.get<Recordatorio[]>(`${API_URL}/reportes/recordatorios`, { params });
  }

  productividad(desde?: string, hasta?: string): Observable<ProductividadMecanico[]> {
    let params = new HttpParams();
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }
    return this.http.get<ProductividadMecanico[]>(
      `${API_URL}/reportes/mecanicos/productividad`,
      { params },
    );
  }

  // ---------- Clientes ----------
  clientes(q?: string): Observable<Cliente[]> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<Cliente[]>(`${API_URL}/clientes`, { params });
  }

  crearCliente(datos: ClientePayload): Observable<Cliente> {
    return this.http.post<Cliente>(`${API_URL}/clientes`, datos);
  }

  actualizarCliente(id: number, datos: ClientePayload): Observable<Cliente> {
    return this.http.put<Cliente>(`${API_URL}/clientes/${id}`, datos);
  }

  eliminarCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/clientes/${id}`);
  }

  // ---------- Vehiculos ----------
  vehiculos(clienteId?: number): Observable<Vehiculo[]> {
    const params = clienteId ? new HttpParams().set('clienteId', clienteId) : undefined;
    return this.http.get<Vehiculo[]>(`${API_URL}/vehiculos`, { params });
  }

  crearVehiculo(datos: VehiculoPayload): Observable<Vehiculo> {
    return this.http.post<Vehiculo>(`${API_URL}/vehiculos`, datos);
  }

  actualizarVehiculo(id: number, datos: VehiculoPayload): Observable<Vehiculo> {
    return this.http.put<Vehiculo>(`${API_URL}/vehiculos/${id}`, datos);
  }

  eliminarVehiculo(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/vehiculos/${id}`);
  }

  // ---------- Catalogos ----------
  mecanicos(soloActivos?: boolean): Observable<Mecanico[]> {
    const params =
      soloActivos === undefined ? undefined : new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<Mecanico[]>(`${API_URL}/mecanicos`, { params });
  }

  crearMecanico(datos: MecanicoPayload): Observable<Mecanico> {
    return this.http.post<Mecanico>(`${API_URL}/mecanicos`, datos);
  }

  actualizarMecanico(id: number, datos: MecanicoPayload): Observable<Mecanico> {
    return this.http.put<Mecanico>(`${API_URL}/mecanicos/${id}`, datos);
  }

  eliminarMecanico(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/mecanicos/${id}`);
  }

  paquetes(soloActivos?: boolean): Observable<Paquete[]> {
    const params =
      soloActivos === undefined ? undefined : new HttpParams().set('soloActivos', soloActivos);
    return this.http.get<Paquete[]>(`${API_URL}/paquetes`, { params });
  }

  crearPaquete(datos: PaquetePayload): Observable<Paquete> {
    return this.http.post<Paquete>(`${API_URL}/paquetes`, datos);
  }

  actualizarPaquete(id: number, datos: PaquetePayload): Observable<Paquete> {
    return this.http.put<Paquete>(`${API_URL}/paquetes/${id}`, datos);
  }

  eliminarPaquete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/paquetes/${id}`);
  }

  insumos(categoria?: CategoriaInsumo, q?: string): Observable<Insumo[]> {
    let params = new HttpParams();
    if (categoria) {
      params = params.set('categoria', categoria);
    }
    if (q) {
      params = params.set('q', q);
    }
    return this.http.get<Insumo[]>(`${API_URL}/insumos`, { params });
  }

  alertasStock(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${API_URL}/insumos/alertas-stock`);
  }

  crearInsumo(datos: InsumoPayload): Observable<Insumo> {
    return this.avisarCambioIndicadores(this.http.post<Insumo>(`${API_URL}/insumos`, datos));
  }

  actualizarInsumo(id: number, datos: Omit<InsumoPayload, 'stockActual'>): Observable<Insumo> {
    return this.avisarCambioIndicadores(this.http.put<Insumo>(`${API_URL}/insumos/${id}`, datos));
  }

  ajustarStock(id: number, stockEsperado: number, stockNuevo: number, motivo: string): Observable<Insumo> {
    return this.avisarCambioIndicadores(
      this.http.patch<Insumo>(`${API_URL}/insumos/${id}/stock`, { stockEsperado, stockNuevo, motivo }),
    );
  }

  eliminarInsumo(id: number): Observable<void> {
    return this.avisarCambioIndicadores(this.http.delete<void>(`${API_URL}/insumos/${id}`));
  }

  configuracion(): Observable<ConfiguracionTaller> {
    return this.http.get<ConfiguracionTaller>(`${API_URL}/configuracion`);
  }

  // ---------- Citas ----------
  citas(estado?: EstadoCita): Observable<Cita[]> {
    const params = estado ? new HttpParams().set('estado', estado) : undefined;
    return this.http.get<Cita[]>(`${API_URL}/citas`, { params });
  }

  crearCita(datos: CitaPayload): Observable<Cita> {
    return this.avisarCambioIndicadores(this.http.post<Cita>(`${API_URL}/citas`, datos));
  }

  cambiarEstadoCita(id: number, estadoCita: EstadoCita): Observable<Cita> {
    return this.avisarCambioIndicadores(
      this.http.patch<Cita>(`${API_URL}/citas/${id}/estado`, { estadoCita }),
    );
  }

  convertirCita(id: number, datos: ConvertirCitaPayload): Observable<InformeDetalle> {
    return this.avisarCambioIndicadores(
      this.http.post<InformeDetalle>(`${API_URL}/citas/${id}/convertir`, datos),
    );
  }

  eliminarCita(id: number): Observable<void> {
    return this.avisarCambioIndicadores(this.http.delete<void>(`${API_URL}/citas/${id}`));
  }

  // ---------- Ordenes ----------
  informes(estado?: EstadoInforme, placa?: string): Observable<InformeResumen[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    if (placa) {
      params = params.set('placa', placa);
    }
    return this.http.get<InformeResumen[]>(`${API_URL}/informes`, { params });
  }

  crearInforme(datos: {
    vehiculoId: number;
    paqueteId: number;
    mecanicoId: number;
    kilometrajeIngreso: number;
    nivelCombustible: NivelCombustible;
    inventarioRecepcion: string;
    observacionesRecepcion: string;
  }): Observable<InformeDetalle> {
    return this.avisarCambioIndicadores(this.http.post<InformeDetalle>(`${API_URL}/informes`, datos));
  }

  actualizarInforme(id: number, datos: {
    mecanicoId: number;
    kilometrajeIngreso: number;
    nivelCombustible: NivelCombustible;
    inventarioRecepcion: string;
    observacionesRecepcion: string;
    recomendacionesFuturas: string;
    observacionesGenerales: string;
  }): Observable<InformeDetalle> {
    return this.http.put<InformeDetalle>(`${API_URL}/informes/${id}`, datos);
  }

  subirEvidencia(id: number, archivo: File, etapa: string, descripcion: string): Observable<Evidencia> {
    const datos = new FormData();
    datos.set('archivo', archivo);
    datos.set('etapa', etapa);
    datos.set('descripcion', descripcion);
    return this.http.post<Evidencia>(`${API_URL}/informes/${id}/evidencias`, datos);
  }

  eliminarEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/evidencias/${id}`);
  }

  subirFichaTecnica(id: number, archivo: File): Observable<InformeDetalle> {
    const datos = new FormData();
    datos.set('archivo', archivo);
    return this.http.post<InformeDetalle>(`${API_URL}/informes/${id}/ficha-tecnica`, datos);
  }

  cargarArchivo(ruta: string): Observable<Blob> {
    return this.http.get(this.urlArchivo(ruta), { responseType: 'blob' });
  }

  guardarDescarga(archivo: Blob, nombre: string): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  obtenerInforme(id: number): Observable<InformeDetalle> {
    return this.http.get<InformeDetalle>(`${API_URL}/informes/${id}`);
  }

  cambiarEstadoInforme(id: number, estado: EstadoInforme): Observable<InformeDetalle> {
    return this.avisarCambioIndicadores(
      this.http.patch<InformeDetalle>(`${API_URL}/informes/${id}/estado`, { estado }),
    );
  }

  actualizarEscaneos(id: number, datos: EscaneosPayload): Observable<InformeDetalle> {
    return this.http.patch<InformeDetalle>(`${API_URL}/informes/${id}/escaneos`, datos);
  }

  actualizarChecklist(
    informeId: number,
    detalleId: number,
    datos: {
      estadoComponente?: string;
      accionRealizada: string;
      valorMedido?: string;
      observacionTecnica?: string;
    },
  ): Observable<ChecklistItem> {
    return this.http.patch<ChecklistItem>(`${API_URL}/informes/${informeId}/checklist/${detalleId}`, datos);
  }

  registrarConsumo(informeId: number, insumoId: number, cantidad: number, claveOperacion: string): Observable<Consumo> {
    return this.avisarCambioIndicadores(
      this.http.post<Consumo>(`${API_URL}/informes/${informeId}/consumos`, { insumoId, cantidad, claveOperacion }),
    );
  }

  eliminarConsumo(id: number): Observable<void> {
    return this.avisarCambioIndicadores(this.http.delete<void>(`${API_URL}/consumos/${id}`));
  }

  registrarAdicional(informeId: number, datos: AdicionalPayload): Observable<Adicional> {
    return this.http.post<Adicional>(`${API_URL}/informes/${informeId}/adicionales`, datos);
  }

  actualizarAdicional(id: number, datos: AdicionalPayload): Observable<Adicional> {
    return this.http.put<Adicional>(`${API_URL}/adicionales/${id}`, datos);
  }

  cambiarAprobacionAdicional(id: number, aprobado: boolean): Observable<Adicional> {
    const params = new HttpParams().set('aprobado', aprobado);
    return this.http.patch<Adicional>(`${API_URL}/adicionales/${id}/aprobacion`, null, { params });
  }

  eliminarAdicional(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/adicionales/${id}`);
  }

  registrarPago(informeId: number, datos: PagoPayload): Observable<Pago> {
    return this.avisarCambioIndicadores(this.http.post<Pago>(`${API_URL}/informes/${informeId}/pagos`, datos));
  }

  eliminarPago(id: number): Observable<void> {
    return this.http.delete<void>(`${API_URL}/pagos/${id}`);
  }

  reporte(informeId: number): Observable<unknown> {
    return this.http.get<unknown>(`${API_URL}/informes/${informeId}/reporte`);
  }

  urlArchivo(ruta?: string | null): string {
    if (!ruta) {
      return '';
    }
    return ruta.startsWith('http') ? ruta : `${UPLOADS_URL}${ruta}`;
  }
}
