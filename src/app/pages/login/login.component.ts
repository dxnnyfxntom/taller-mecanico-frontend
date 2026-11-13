import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { TemaToggleComponent } from '../../components/tema-toggle/tema-toggle.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TemaToggleComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verClave = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    username: ['admin', [Validators.required]],
    password: ['admin123', [Validators.required, Validators.minLength(4)]],
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.auth.login(this.formulario.getRawValue()).subscribe({
      next: () => {
        void this.router.navigate([this.auth.esMecanico() ? '/ordenes' : '/dashboard']);
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(
          respuesta.error?.mensaje ?? 'No se pudo iniciar sesion. Verifique sus credenciales.',
        );
        this.cargando.set(false);
      },
    });
  }
}
