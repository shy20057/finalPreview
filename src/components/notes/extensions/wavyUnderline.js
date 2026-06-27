import { Mark, mergeAttributes } from '@tiptap/core'

export const WavyUnderline = Mark.create({
  name: 'wavyUnderline',

  parseHTML() {
    return [{ tag: 'u.wavy' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['u', mergeAttributes(HTMLAttributes, { class: 'wavy' }), 0]
  },

  addCommands() {
    return {
      toggleWavyUnderline: () => ({ commands }) => commands.toggleMark(this.name),
    }
  },
})
