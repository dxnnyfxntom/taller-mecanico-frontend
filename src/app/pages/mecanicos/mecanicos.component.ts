import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Mecanico } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

type FiltroActivo = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-mecanicos',
  imports: [ReactiveFormsModule],
  templateUrl: './mecanicos.component.html',
  styleUrl: './mecanicos.component.scss',
})
export class MecanicosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);

  protected readonly mecanicos = signal<Mecanico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<FiltroActivo>('todos');
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<Mecanico | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly activos = computed(
    () => this.mecanicos().filter((mecanico) => mecanico.activo).length,
  );
  protected readonly inactivos = computed(() => this.mecanicos().length - this.activos());

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtro();

    return this.mecanicos().filter((mecanico) => {
      const coincideEstado =
        filtro === 'todos' ||
        (filtro === 'activos' && mecanico.activo) ||
        (filtro === 'inactivos' && !mecanico.activo);
      const coincideTexto =
        !texto ||
        [mecanico.nombreCompleto, mecanico.dni, mecanico.especialidad ?? '', mecanico.telefono ?? '']
          .join(' ')
          .toLowerCase()
          .includes(texto);
      return coincideEstado && coincideTexto;
    });
  });

  protected readonly formulario = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.maxLength(150)]],
    dni: ['', [Validators.required, Validators.maxLength(20)]],
    especialidad: ['', [Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(20)]],
    activo: [true],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.mecanicos().subscribe({
      next: (mecanicos) => {
        this.mecanicos.set(mecanicos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el equipo tecnico.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formulario.reset({
      nombreCompleto: '',
      dni: '',
      especialidad: '',
      telefono: '',
      activo: true,
    });
    this.modalAbierto.set(true);
  }

  protected abrirEditar(mecanico: Mecanico): void {
    this.editando.set(mecanico);
    this.formulario.reset({
      nombreCompleto: mecanico.nombreCompleto,
      dni: mecanico.dni,
      especialidad: mecanico.especialidad ?? '',
      telefono: mecanico.telefono ?? '',
      activo: mecanico.activo,
    });
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.editando.set(null);
  }

  protected guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const datos = {
      nombreCompleto: valores.nombreCompleto.trim(),
      dni: valores.dni.trim(),
      especialidad: valores.especialidad.trim() || undefined,
      telefono: valores.telefono.trim() || undefined,
      activo: valores.activo,
    };

    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.taller.actualizarMecanico(actual.id, datos)
      : this.taller.crearMecanico(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.aviso.set(actual ? 'Mecanico actualizado.' : 'Mecanico registrado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo guardar el mecanico.');
      },
    });
  }

  protected eliminar(mecanico: Mecanico): void {
    if (!confirm(`Eliminar a ${mecanico.nombreCompleto}?`)) {
      return;
    }
    this.taller.eliminarMecanico(mecanico.id).subscribe({
      next: () => {
        this.aviso.set('Mecanico eliminado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el mecanico.');
      },
    });
  }
}
