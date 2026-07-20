import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'replaceSpaces',
  standalone: true
})
export class ReplaceSpacesPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;
    return value.replace(/\s+/g, '').toLowerCase();
  }
}