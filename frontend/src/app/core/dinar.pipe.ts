import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dinar', standalone: true })
export class DinarPipe implements PipeTransform {
  transform(value: number | null | undefined, precise = false): string {
    if (value === null || value === undefined) {
      return 'Prix à discuter';
    }
    const amount = Number(value);
    const formatted = precise || !Number.isInteger(amount)
      ? amount.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
      : amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
    return `${formatted} DT`;
  }
}
