import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CategoriaItem,
  Paquete,
  PaquetePayload,
  PlantillaItem,
  TipoCombustible,
} from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

type FiltroActivo = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-paquetes',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './paquetes.component.html',
  styleUrl: './paquetes.component.scss',
})
export class PaquetesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);

  protected readonly paquetes = signal<Paquete[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtro = signal<FiltroActivo>('todos');
  protected readonly expandido = signal<number | null>(null);
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<Paquete | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly combustibles: TipoCombustible[] = ['GASOLINA', 'GLP', 'GNV', 'DIESEL'];

  protected readonly categorias: CategoriaItem[] = [
    'ESCANEO',
    'LUBRICACION',
    'MOTOR',
    'PRUEBA_ELECTRONICA',
    'FLUIDOS',
    'CORTESIA',
    'FRENOS',
  ];

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtro();

    return this.paquetes().filter((paquete) => {
      const coincideEstado =
        filtro === 'todos' ||
        (filtro === 'activos' && paquete.activo) ||
        (filtro === 'inactivos' && !paquete.activo);
      const coincideTexto =
        !texto ||
        [paquete.nombre, paquete.tipoCombustible].join(' ').toLowerCase().includes(texto);
      return coincideEstado && coincideTexto;
    });
  });

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    tipoCombustible: ['GASOLINA' as TipoCombustible, [Validators.required]],
    precioBase: [0, [Validators.required, Validators.min(0)]],
    tiempoEstimadoHoras: [1, [Validators.required, Validators.min(1)]],
    garantiaKm: [0, [Validators.required, Validators.min(0)]],
    garantiaMeses: [0, [Validators.required, Validators.min(0)]],
    activo: [true],
    items: this.fb.nonNullable.array([this.crearItemFormulario(1)]),
  });

  protected get items() {
    return this.formulario.controls.items;
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.paquetes().subscribe({
      next: (paquetes) => {
        this.paquetes.set(paquetes);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los paquetes de servicio.');
        this.cargando.set(false);
      },
    });
  }

  protected itemsOrdenados(paquete: Paquete): PlantillaItem[] {
    return [...paquete.items].sort((a, b) => a.ordenVisualizacion - b.ordenVisualizacion);
  }

  protected toggleDetalle(id: number): void {
    this.expandido.set(this.expandido() === id ? null : id);
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formulario.reset({
      nombre: '',
      tipoCombustible: 'GASOLINA',
      precioBase: 0,
      tiempoEstimadoHoras: 1,
      garantiaKm: 0,
      garantiaMeses: 0,
      activo: true,
    });
    this.items.clear();
    this.items.push(this.crearItemFormulario(1));
    this.modalAbierto.set(true);
  }

  protected abrirEditar(paquete: Paquete): void {
    this.editando.set(paquete);
    this.formulario.reset({
      nombre: paquete.nombre,
      tipoCombustible: paquete.tipoCombustible,
      precioBase: paquete.precioBase,
      tiempoEstimadoHoras: paquete.tiempoEstimadoHoras,
      garantiaKm: paquete.garantiaKm,
      garantiaMeses: paquete.garantiaMeses,
      activo: paquete.activo,
    });

    this.items.clear();
    const ordenados = this.itemsOrdenados(paquete);
    if (ordenados.length === 0) {
      this.items.push(this.crearItemFormulario(1));
    } else {
      ordenados.forEach((item) => {
        const grupo = this.crearItemFormulario(item.ordenVisualizacion);
        grupo.patchValue({
          categoria: item.categoria,
          descripcionTarea: item.descripcionTarea,
          esCondicional: item.esCondicional,
          requiereFichaTecnica: item.requiereFichaTecnica,
          ordenVisualizacion: item.ordenVisualizacion,
        });
        this.items.push(grupo);
      });
    }

    this.modalAbierto.set(true);
  }

  protected agregarItem(): void {
    this.items.push(this.crearItemFormulario(this.items.length + 1));
  }

  protected quitarItem(indice: number): void {
    if (this.items.length <= 1) {
      return;
    }
    this.items.removeAt(indice);
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
    const datos: PaquetePayload = {
      nombre: valores.nombre.trim(),
      tipoCombustible: valores.tipoCombustible,
      precioBase: Number(valores.precioBase),
      tiempoEstimadoHoras: Number(valores.tiempoEstimadoHoras),
      garantiaKm: Number(valores.garantiaKm),
      garantiaMeses: Number(valores.garantiaMeses),
      activo: valores.activo,
      items: valores.items.map((item, indice) => ({
        categoria: item.categoria,
        descripcionTarea: item.descripcionTarea.trim(),
        esCondicional: item.esCondicional,
        requiereFichaTecnica: item.requiereFichaTecnica,
        ordenVisualizacion: Number(item.ordenVisualizacion) || indice + 1,
      })),
    };

    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.taller.actualizarPaquete(actual.id, datos)
      : this.taller.crearPaquete(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.aviso.set(actual ? 'Paquete actualizado.' : 'Paquete registrado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo guardar el paquete.');
      },
    });
  }

  protected eliminar(paquete: Paquete): void {
    if (!confirm(`Eliminar el paquete ${paquete.nombre}?`)) {
      return;
    }
    this.taller.eliminarPaquete(paquete.id).subscribe({
      next: () => {
        this.aviso.set('Paquete eliminado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el paquete.');
      },
    });
  }

  private crearItemFormulario(orden: number) {
    return this.fb.nonNullable.group({
      categoria: ['MOTOR' as CategoriaItem, [Validators.required]],
      descripcionTarea: ['', [Validators.required, Validators.maxLength(300)]],
      esCondicional: [false],
      requiereFichaTecnica: [false],
      ordenVisualizacion: [orden, [Validators.required, Validators.min(1)]],
    });
  }
}
