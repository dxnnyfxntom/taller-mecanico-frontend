import { Component, computed, inject } from '@angular/core';

import { TemaService } from '../../services/tema.service';

@Component({
  selector: 'app-tema-toggle',
  template: `
    <button type="button" [attr.aria-label]="accion()" [title]="accion()" (click)="tema.alternar()">
      <span [class]="tema.oscuro() ? 'sol' : 'luna'" aria-hidden="true"></span>
    </button>
  `,
  styleUrl: './tema-toggle.component.scss',
})
export class TemaToggleComponent {
  protected readonly tema = inject(TemaService);
  protected readonly accion = computed(() =>
    this.tema.oscuro() ? 'Activar modo claro' : 'Activar modo oscuro',
  );
}
