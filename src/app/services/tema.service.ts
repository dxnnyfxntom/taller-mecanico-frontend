import { DOCUMENT, DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

type Tema = 'light' | 'dark';

const CLAVE_TEMA = 'taller-tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly ventana = this.documento.defaultView;
  private readonly preferenciaSistema = this.ventana?.matchMedia?.('(prefers-color-scheme: dark)');
  private eleccion = this.leerPreferencia();
  private readonly tema = signal<Tema>(
    this.eleccion ?? (this.preferenciaSistema?.matches ? 'dark' : 'light'),
  );

  readonly oscuro = computed(() => this.tema() === 'dark');

  constructor() {
    this.aplicar(this.tema());

    if (this.preferenciaSistema) {
      const consulta = this.preferenciaSistema;
      const actualizar = (evento: MediaQueryListEvent) => {
        if (this.eleccion === null) {
          this.aplicar(evento.matches ? 'dark' : 'light');
        }
      };

      consulta.addEventListener('change', actualizar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', actualizar));
    }
  }

  alternar(): void {
    const siguiente = this.oscuro() ? 'light' : 'dark';
    this.eleccion = siguiente;
    this.aplicar(siguiente);
    try {
      this.ventana?.localStorage.setItem(CLAVE_TEMA, siguiente);
    } catch {
      // La preferencia sigue activa durante esta sesión.
    }
  }

  private aplicar(tema: Tema): void {
    this.documento.documentElement.dataset['theme'] = tema;
    this.tema.set(tema);
  }

  private leerPreferencia(): Tema | null {
    try {
      const tema = this.ventana?.localStorage.getItem(CLAVE_TEMA);
      return tema === 'dark' || tema === 'light' ? tema : null;
    } catch {
      return null;
    }
  }
}
