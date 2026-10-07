import type { Grid } from '@formily/grid'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test.each([
  ['maxColumns', 'repeat(1,minmax(0,1fr))'],
  ['colWrap=false', 'repeat(3,minmax(0,1fr))'],
])('applies the exact %s layout before the first paint', (_, exactTemplate) => {
  jest.doMock('../form-layout', () => ({
    useFormLayout: () => ({}),
  }))
  jest.doMock('../__builtins__', () => ({
    pickDataProps: () => ({}),
    usePrefixCls: () => 'ant-formily-grid',
  }))
  jest.doMock('../form-grid/style', () => () => [
    (node: React.ReactNode) => node,
    '',
  ])

  const { FormGrid } = jest.requireActual(
    '../form-grid'
  ) as typeof import('../form-grid')
  let templateColumns = ''
  let templateColumnsAtConnect = ''
  let gridColumnAtConnect = ''
  const dispose = jest.fn()
  const grid = {
    get templateColumns() {
      return templateColumns
    },
    gap: '4px 8px',
    connect: jest.fn((element: HTMLElement) => {
      templateColumnsAtConnect = element.style.gridTemplateColumns
      gridColumnAtConnect = (element.firstElementChild as HTMLElement).style
        .gridColumn
      templateColumns = exactTemplate
      return dispose
    }),
  } as unknown as Grid<HTMLElement>

  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => {
    root.render(
      <FormGrid grid={grid}>
        <FormGrid.GridColumn gridSpan={2} />
        <FormGrid.GridColumn />
        <FormGrid.GridColumn />
      </FormGrid>
    )
  })

  expect(templateColumnsAtConnect).toBe('')
  expect(gridColumnAtConnect).toBe('span 2 / auto')
  expect(
    (container.firstElementChild as HTMLElement).style.gridTemplateColumns
  ).toBe(exactTemplate)
  expect(
    (container.firstElementChild?.firstElementChild as HTMLElement).style
      .gridColumn
  ).toBe('span 2 / auto')

  act(() => root.unmount())
  expect(dispose).toHaveBeenCalledTimes(1)
})
