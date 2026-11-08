export type Rol = 'ADMIN' | 'RECEPCION' | 'MECANICO';

export interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: Rol;
  activo: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: number;
  usuario: Usuario;
}

export interface Cliente {
  id: number;
  dniRuc: string;
  nombreCompleto: string;
  telefonoWhatsapp: string;
  correo?: string | null;
  direccion?: string | null;
  fechaRegistro?: string;
}

export interface ClientePayload {
  dniRuc: string;
  nombreCompleto: string;
  telefonoWhatsapp: string;
  correo?: string;
  direccion?: string;
}

export type TipoCombustible = 'GASOLINA' | 'GLP' | 'GNV' | 'DIESEL';

export interface Vehiculo {
  id: number;
  cliente: Cliente;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoCombustible: TipoCombustible;
  vinMotor?: string | null;
  color?: string | null;
  kilometrajeActual: number;
}

export interface VehiculoPayload {
  cliente: { id: number };
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  tipoCombustible: TipoCombustible;
  vinMotor?: string;
  color?: string;
  kilometrajeActual: number;
}

export interface Mecanico {
  id: number;
  nombreCompleto: string;
  dni: string;
  especialidad?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export type CategoriaItem =
  | 'ESCANEO'
  | 'LUBRICACION'
  | 'MOTOR'
  | 'PRUEBA_ELECTRONICA'
  | 'FLUIDOS'
  | 'CORTESIA'
  | 'FRENOS';

export type CategoriaInsumo = 'ACEITE' | 'FILTRO' | 'ARANDELA' | 'FLUIDO' | 'REPUESTO';

export interface MecanicoPayload {
  nombreCompleto: string;
  dni: string;
  especialidad?: string;
  telefono?: string;
  activo: boolean;
}

export interface PlantillaItem {
  id?: number;
  categoria: CategoriaItem;
  descripcionTarea: string;
  esCondicional: boolean;
  requiereFichaTecnica: boolean;
  ordenVisualizacion: number;
}

export interface Paquete {
  id: number;
  nombre: string;
  tipoCombustible: TipoCombustible;
  precioBase: number;
  tiempoEstimadoHoras: number;
  garantiaKm: number;
  garantiaMeses: number;
  activo: boolean;
  items: PlantillaItem[];
}

export interface PaquetePayload {
  nombre: string;
  tipoCombustible: TipoCombustible;
  precioBase: number;
  tiempoEstimadoHoras: number;
  garantiaKm: number;
  garantiaMeses: number;
  activo: boolean;
  items: PlantillaItem[];
}

export interface Insumo {
  id: number;
  codigo: string;
  nombre: string;
  categoria: CategoriaInsumo;
  stockActual: number;
  stockMinimo: number;
  precioVenta: number;
  urlFichaTecnicaPdf?: string | null;
}

export interface InsumoPayload {
  codigo: string;
  nombre: string;
  categoria: CategoriaInsumo;
  stockActual: number;
  stockMinimo: number;
  precioVenta: number;
}

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'EN_TALLER' | 'CANCELADA';

export interface Cita {
  id: number;
  clienteId: number;
  clienteNombre: string;
  clienteTelefono: string;
  vehiculoId: number;
  placa: string;
  marcaModelo: string;
  paqueteId: number;
  paqueteNombre: string;
  fechaHoraInicio: string;
  fechaHoraFinCalculada: string;
  estadoCita: EstadoCita;
  observaciones?: string | null;
  informeId?: number | null;
  fechaCreacion: string;
}

export interface CitaPayload {
  clienteId: number;
  vehiculoId: number;
  paqueteId: number;
  fechaHoraInicio: string;
  observaciones?: string;
}

export type NivelCombustible = 'RESERVA' | 'CUARTO' | 'MEDIO' | 'TRES_CUARTOS' | 'LLENO';

export interface ConvertirCitaPayload {
  mecanicoId: number;
  kilometrajeIngreso: number;
  nivelCombustible: NivelCombustible;
  inventarioRecepcion?: string;
  observacionesRecepcion?: string;
}

export type EstadoInforme =
  | 'RECEPCIONADO'
  | 'EN_PROCESO'
  | 'LISTO_PARA_ENTREGA'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface InformeResumen {
  id: number;
  numeroOrden: string;
  clienteNombre: string;
  clienteTelefono: string;
  vehiculoId: number;
  placa: string;
  marcaModelo: string;
  paqueteNombre: string;
  mecanicoNombre: string;
  fechaIngreso: string;
  fechaEstimadaEntrega: string;
  fechaEntregaReal?: string | null;
  fechaProximoServicio: string;
  kilometrajeIngreso: number;
  kilometrajeProximoServicio: number;
  estado: EstadoInforme;
  totalOrden: number;
  totalPagado: number;
  saldoPendiente: number;
}

export interface ChecklistItem {
  id: number;
  categoria: string;
  descripcionTarea: string;
  esCondicional: boolean;
  requiereFichaTecnica: boolean;
  ordenVisualizacion: number;
  estadoComponente?: string | null;
  accionRealizada?: string | null;
  valorMedido?: string | null;
  observacionTecnica?: string | null;
  fechaActualizacion?: string | null;
}

export interface InformeTotales {
  totalPaquete: number;
  totalAdicionales: number;
  totalNoCobrado: number;
  totalOrden: number;
  totalPagado: number;
  saldoPendiente: number;
}

export interface InformeDetalle {
  id: number;
  numeroOrden: string;
  fechaIngreso: string;
  fechaEstimadaEntrega: string;
  fechaEntregaReal?: string | null;
  fechaProximoServicio: string;
  estado: EstadoInforme;
  citaId?: number | null;
  nivelCombustible: NivelCombustible;
  kilometrajeIngreso: number;
  kilometrajeProximoServicio: number;
  inventarioRecepcion?: string | null;
  observacionesRecepcion?: string | null;
  escaneoInicialResultado?: string | null;
  escaneoFinalResultado?: string | null;
  fichaTecnicaPdfUrl?: string | null;
  recomendacionesFuturas?: string | null;
  observacionesGenerales?: string | null;
  cliente: Cliente;
  vehiculo: Vehiculo;
  mecanico: Mecanico;
  paquete: Paquete;
  checklist: ChecklistItem[];
  consumos: Consumo[];
  adicionales: Adicional[];
  pagos: Pago[];
  evidencias: Evidencia[];
  totales: InformeTotales;
  taller: ConfiguracionTaller;
}

export interface Consumo {
  id: number;
  insumoId: number;
  codigo: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type TipoAdicional = 'REPUESTO' | 'MANO_OBRA';

export interface Adicional {
  id: number;
  descripcion: string;
  tipo: TipoAdicional;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  aprobadoPorCliente: boolean;
  cobraArandela: boolean;
  seCobra: boolean;
}

export interface AdicionalPayload {
  descripcion: string;
  tipo: TipoAdicional;
  cantidad: number;
  precioUnitario: number;
  aprobadoPorCliente: boolean;
  cobraArandela: boolean;
}

export type TipoPago = 'ADELANTO' | 'LIQUIDACION';
export type MedioPago = 'EFECTIVO' | 'YAPE_PLIN' | 'TRANSFERENCIA' | 'TARJETA';

export interface Pago {
  id: number;
  fechaPago: string;
  monto: number;
  tipoPago: TipoPago;
  medioPago: MedioPago;
  referencia?: string | null;
}

export interface PagoPayload {
  monto: number;
  tipoPago: TipoPago;
  medioPago: MedioPago;
  referencia?: string;
}

export interface EscaneosPayload {
  escaneoInicialResultado?: string;
  escaneoFinalResultado?: string;
}

export interface Evidencia {
  id: number;
  urlImagen: string;
  descripcionFoto?: string | null;
  etapa: string;
  fechaSubida: string;
}

export interface ConfiguracionTaller {
  id: number;
  nombreTaller: string;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  telefonoWhatsapp?: string | null;
  correo?: string | null;
  logoUrl?: string | null;
  capacidadMaximaSimultanea: number;
  horarioAtencion?: string | null;
  textoGarantia?: string | null;
  mensajeRecordatorio?: string | null;
}

export interface Recordatorio {
  informeId: number;
  clienteId?: number;
  clienteNombre: string;
  telefonoWhatsapp: string;
  vehiculoId?: number;
  placa: string;
  marcaModelo: string;
  ultimoServicio?: string;
  kilometrajeIngreso?: number;
  kilometrajeActual?: number;
  kilometrajeProximoServicio?: number;
  fechaProximoServicio: string;
  diasRestantes: number;
  kmRestantes: number;
  motivo: string;
  estadoAlerta: string;
  whatsappUrl: string;
  mensaje: string;
}

export interface ConteoEstado {
  etiqueta: string;
  total: number;
}

export interface Dashboard {
  totalOrdenes: number;
  ordenesActivas: number;
  ordenesRecepcionadas: number;
  ordenesEnProceso: number;
  ordenesListas: number;
  ordenesEntregadasMes: number;
  citasHoy: number;
  citasPendientes: number;
  ingresosMes: number;
  saldoPorCobrar: number;
  insumosStockCritico: number;
  recordatoriosPendientes: number;
  ordenesRecientes: InformeResumen[];
  recordatoriosProximos: Recordatorio[];
  ordenesPorEstado: ConteoEstado[];
}

export interface HistorialVisita {
  informeId: number;
  numeroOrden: string;
  fecha: string;
  paquete: string;
  mecanico: string;
  kilometraje: number;
  aceiteUtilizado?: string | null;
  fichaTecnicaPdfUrl?: string | null;
  adicionales: string[];
  recomendaciones?: string | null;
  total: number;
  totalPagado: number;
  saldoPendiente: number;
  estado: EstadoInforme;
}

export interface HistorialPlaca {
  cliente: Cliente;
  vehiculo: Vehiculo;
  visitas: HistorialVisita[];
}

export interface ProductividadMecanico {
  mecanicoId: number;
  nombreCompleto: string;
  especialidad?: string | null;
  activo: boolean;
  totalOrdenes: number;
  ordenesEntregadas: number;
  totalFacturado: number;
}
