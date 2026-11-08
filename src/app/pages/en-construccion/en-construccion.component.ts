import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-en-construccion',
  imports: [RouterLink],
  templateUrl: './en-construccion.component.html',
  styleUrl: './en-construccion.component.scss',
})
export class EnConstruccionComponent {
  private readonly ruta = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  protected readonly titulo = toSignal(
    this.ruta.data.pipe(map((datos) => (datos['titulo'] as string) ?? 'Modulo en construccion')),
    { initialValue: 'Modulo en construccion' },
  );

  protected readonly descripcion = toSignal(
    this.ruta.data.pipe(
      map(
        (datos) =>
          (datos['descripcion'] as string) ??
          'Este modulo forma parte de la siguiente entrega del proyecto.',
      ),
    ),
    { initialValue: 'Este modulo forma parte de la siguiente entrega del proyecto.' },
  );

  protected readonly usuario = computed(() => this.auth.usuario()?.nombreCompleto ?? 'usuario');
}
