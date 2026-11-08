import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, of, tap } from 'rxjs';

import { LoginRequest, LoginResponse, Usuario } from '../models/api.models';
import { API_URL } from './api.config';

const TOKEN_KEY = 'taller_token';
const USER_KEY = 'taller_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly autenticado = computed(() => !!this.token());
  readonly inicializando = signal(true);

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        this.token.set(respuesta.token);
        this.usuario.set(respuesta.usuario);
        localStorage.setItem(TOKEN_KEY, respuesta.token);
        localStorage.setItem(USER_KEY, JSON.stringify(respuesta.usuario));
      }),
    );
  }

  async restaurarSesion(): Promise<void> {
    if (!this.token()) {
      this.inicializando.set(false);
      return;
    }
    try {
      const usuario = await firstValueFrom(
        this.http.get<Usuario>(`${API_URL}/auth/me`).pipe(
          catchError(() => {
            this.limpiar();
            return of(null);
          }),
        ),
      );
      if (usuario) {
        this.usuario.set(usuario);
        localStorage.setItem(USER_KEY, JSON.stringify(usuario));
      }
    } finally {
      this.inicializando.set(false);
    }
  }

  logout(redirigir = true): void {
    this.limpiar();
    if (redirigir) {
      void this.router.navigate(['/login']);
    }
  }

  private limpiar(): void {
    this.token.set(null);
    this.usuario.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private leerUsuario(): Usuario | null {
    const guardado = localStorage.getItem(USER_KEY);
    if (!guardado) {
      return null;
    }
    try {
      return JSON.parse(guardado) as Usuario;
    } catch {
      return null;
    }
  }
}
