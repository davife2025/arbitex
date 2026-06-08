import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Stat } from '@/components/ui/Stat'
import { Input } from '@/components/ui/Input'

// ── Badge ────────────────────────────────────────────────────

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>LONG</Badge>)
    expect(screen.getByText('LONG')).toBeInTheDocument()
  })

  it('renders dot when dot prop is true', () => {
    const { container } = render(<Badge dot>Active</Badge>)
    const dots = container.querySelectorAll('span span')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('applies success variant class', () => {
    const { container } = render(<Badge variant="success">OK</Badge>)
    expect(container.firstChild).toHaveClass('text-success')
  })

  it('applies danger variant class', () => {
    const { container } = render(<Badge variant="danger">STOP</Badge>)
    expect(container.firstChild).toHaveClass('text-danger')
  })

  it('defaults to neutral variant', () => {
    const { container } = render(<Badge>Default</Badge>)
    expect(container.firstChild).toHaveClass('text-tx-secondary')
  })
})

// ── Button ───────────────────────────────────────────────────

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Wait</Button>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies danger variant', () => {
    const { container } = render(<Button variant="danger">Delete</Button>)
    expect(container.firstChild).toHaveClass('text-danger')
  })
})

// ── Stat ─────────────────────────────────────────────────────

describe('Stat', () => {
  it('renders label and value', () => {
    render(<Stat label="Total Equity" value="$65,000" />)
    expect(screen.getByText('Total Equity')).toBeInTheDocument()
    expect(screen.getByText('$65,000')).toBeInTheDocument()
  })

  it('renders sub text when provided', () => {
    render(<Stat label="PnL" value="+200" sub="USDT" />)
    expect(screen.getByText('USDT')).toBeInTheDocument()
  })

  it('applies success color on up trend', () => {
    const { container } = render(<Stat label="PnL" value="+500" trend="up" />)
    const valueEl = container.querySelector('.text-2xl')
    expect(valueEl).toHaveClass('text-success')
  })

  it('applies danger color on down trend', () => {
    const { container } = render(<Stat label="PnL" value="-200" trend="down" />)
    const valueEl = container.querySelector('.text-2xl')
    expect(valueEl).toHaveClass('text-danger')
  })
})

// ── Input ────────────────────────────────────────────────────

describe('Input', () => {
  it('renders label when provided', () => {
    render(<Input label="Size" />)
    expect(screen.getByText('Size')).toBeInTheDocument()
  })

  it('renders suffix when provided', () => {
    render(<Input suffix="USDT" />)
    expect(screen.getByText('USDT')).toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<Input error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('calls onChange handler', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '100' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('applies error border class when error present', () => {
    const { container } = render(<Input error="Bad value" />)
    expect(container.querySelector('input')).toHaveClass('border-danger/60')
  })
})
