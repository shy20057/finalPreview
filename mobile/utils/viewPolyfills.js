// Tiptap runs in the Android WebView. Older system images lack these ES APIs.
if (!Array.prototype.findLast) Object.defineProperty(Array.prototype, 'findLast', {
  configurable: true, writable: true,
  value(predicate, thisArg) {
    for (let index = this.length - 1; index >= 0; index--) {
      if (predicate.call(thisArg, this[index], index, this)) return this[index]
    }
  },
})
if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', {
  configurable: true, writable: true,
  value(index) { const position = Math.trunc(Number(index) || 0); return this[position < 0 ? this.length + position : position] },
})
if (!Object.hasOwn) Object.defineProperty(Object, 'hasOwn', {
  configurable: true, writable: true,
  value(object, key) { return Object.prototype.hasOwnProperty.call(object, key) },
})
