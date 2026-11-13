import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeFormulario(respuesta: HttpErrorResponse, alternativo: string): string {
  const campos = respuesta.error?.campos;
  if (campos && typeof campos === 'object') {
    const errores = Object.values(campos).filter((mensaje): mensaje is string => typeof mensaje === 'string');
    if (errores.length) return errores.join('. ');
  }
  return respuesta.error?.mensaje ?? alternativo;
}
