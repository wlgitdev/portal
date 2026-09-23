import { Component, input, output } from '@angular/core';

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

let nextFieldId = 0;

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
})
export class FormField {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly type = input<'text' | 'tel'>('text');
  readonly readonlyField = input(false);
  readonly error = input<string | undefined>(undefined);
  readonly valueChange = output<string>();

  protected readonly inputValue = inputValue;
  protected readonly id = `form-field-${nextFieldId++}`;
}
