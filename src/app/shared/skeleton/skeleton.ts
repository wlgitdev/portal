import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly rows = input(3);
  protected readonly bars = computed(() => Array.from({ length: this.rows() }));
}
