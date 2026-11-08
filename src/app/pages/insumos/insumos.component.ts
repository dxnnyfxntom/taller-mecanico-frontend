import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CategoriaInsumo, Insumo } from '../../models/api.models';
import { TallerService } from '../../services/taller.service';

@Component({
  selector: 'app-insumos',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './insumos.component.html',
  styleUrl: './insumos.component.scss',
})
export class InsumosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly taller = inject(TallerService);

  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busqueda = signal('');
  protected readonly filtroCategoria = signal<'' | CategoriaInsumo>('');
  protected readonly soloCriticos = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly editando = signal<Insumo | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly categorias: CategoriaInsumo[] = [
    'ACEITE',
    'FILTRO',
    'ARANDELA',
    'FLUIDO',
    'REPUESTO',
  ];

  protected readonly criticos = computed(
    () => this.insumos().filter((insumo) => insumo.stockActual <= insumo.stockMinimo).length,
  );

  protected readonly valorInventario = computed(() =>
    this.insumos().reduce(
      (total, insumo) => total + insumo.stockActual * insumo.precioVenta,
      0,
    ),
  );

  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const categoria = this.filtroCategoria();
    const soloCriticos = this.soloCriticos();

    return this.insumos().filter((insumo) => {
      const coincideCategoria = !categoria || insumo.categoria === categoria;
      const coincideStock = !soloCriticos || insumo.stockActual <= insumo.stockMinimo;
      const coincideTexto =
        !texto ||
        [insumo.codigo, insumo.nombre, insumo.categoria]
          .join(' ')
          .toLowerCase()
          .includes(texto);
      return coincideCategoria && coincideStock && coincideTexto;
    });
  });

  protected readonly formulario = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    categoria: ['REPUESTO' as CategoriaInsumo, [Validators.required]],
    stockActual: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.taller.insumos().subscribe({
      next: (insumos) => {
        this.insumos.set(insumos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el inventario.');
        this.cargando.set(false);
      },
    });
  }

  protected abrirNuevo(): void {
    this.editando.set(null);
    this.formulario.reset({
      codigo: '',
      nombre: '',
      categoria: 'REPUESTO',
      stockActual: 0,
      stockMinimo: 0,
      precioVenta: 0,
    });
    this.modalAbierto.set(true);
  }

  protected abrirEditar(insumo: Insumo): void {
    this.editando.set(insumo);
    this.formulario.reset({
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      categoria: insumo.categoria,
      stockActual: insumo.stockActual,
      stockMinimo: insumo.stockMinimo,
      precioVenta: insumo.precioVenta,
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
      codigo: valores.codigo.trim().toUpperCase(),
      nombre: valores.nombre.trim(),
      categoria: valores.categoria,
      stockActual: Number(valores.stockActual),
      stockMinimo: Number(valores.stockMinimo),
      precioVenta: Number(valores.precioVenta),
    };

    this.guardando.set(true);
    const actual = this.editando();
    const peticion = actual
      ? this.taller.actualizarInsumo(actual.id, datos)
      : this.taller.crearInsumo(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.aviso.set(actual ? 'Insumo actualizado.' : 'Insumo registrado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo guardar el insumo.');
      },
    });
  }

  protected eliminar(insumo: Insumo): void {
    if (!confirm(`Eliminar el insumo ${insumo.codigo}?`)) {
      return;
    }
    this.taller.eliminarInsumo(insumo.id).subscribe({
      next: () => {
        this.aviso.set('Insumo eliminado.');
        setTimeout(() => this.aviso.set(null), 3500);
        this.cargar();
      },
      error: (respuesta: HttpErrorResponse) => {
        this.error.set(respuesta.error?.mensaje ?? 'No se pudo eliminar el insumo.');
      },
    });
  }

  protected esCritico(insumo: Insumo): boolean {
    return insumo.stockActual <= insumo.stockMinimo;
  }
}
