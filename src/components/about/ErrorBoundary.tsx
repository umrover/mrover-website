import { Component } from 'react'
import type { ReactNode } from 'react'

// Renders nothing if a child (e.g. a failed model load) throws, so one broken
// View never takes down the rest of the page.
export class ErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  state = { errored: false }
  static getDerivedStateFromError() { return { errored: true } }
  render() { return this.state.errored ? null : this.props.children }
}
