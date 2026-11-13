import { Component, effect, inject, input, signal } from '@angular/core';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-imagen-evidencia',
  template: `
    @if (src(); as imagen) {
      <img [src]="imagen" [alt]="descripcion()" />
    } @else if (error()) {
      <span>Imagen no disponible</span>
    } @else {
      <span>Cargando imagen…</span>
    }
  `,
  styles: ['img { display: block; width: 100%; max-height: 16rem; object-fit: contain; }'],
})
export class ImagenEvidenciaComponent {
  private readonly taller = inject(TallerService);
  readonly ruta = input.required<string>();
  readonly descripcion = input('Evidencia');
  protected readonly src = signal<string | null>(null);
  protected readonly error = signal(false);

  constructor() {
    effect((onCleanup) => {
      this.src.set(null);
      this.error.set(false);
      let url: string | undefined;
      const carga = this.taller.cargarArchivo(this.ruta()).subscribe({
        next: (archivo) => {
          url = URL.createObjectURL(archivo);
          this.src.set(url);
        },
        error: () => this.error.set(true),
      });
      onCleanup(() => {
        carga.unsubscribe();
        if (url) URL.revokeObjectURL(url);
      });
    });
  }
}
