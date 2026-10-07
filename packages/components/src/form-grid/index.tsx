import { Grid, IGridOptions } from '@formily/grid'
import { observer } from '@formily/react'
import { markRaw } from '@formily/reactive'
import cls from 'classnames'
import React, { useCallback, useContext, useMemo } from 'react'
import { useFormLayout } from '../form-layout'
import { pickDataProps, usePrefixCls } from '../__builtins__'

import useStyle from './style'

const FormGridContext = React.createContext<Grid<HTMLElement>>(null as any)

export interface IFormGridProps extends IGridOptions {
  grid?: Grid<HTMLElement>
  prefixCls?: string
  className?: string
  style?: React.CSSProperties
}

export interface IGridColumnProps {
  gridSpan?: number
  style?: React.CSSProperties
  className?: string
}

export const createFormGrid = (props: IFormGridProps) => {
  return markRaw(new Grid(props))
}

export const useFormGrid = () => useContext(FormGridContext)

const InternalFormGrid = observer(
  ({
    children,
    className,
    style,
    ...props
  }: React.PropsWithChildren<IFormGridProps>) => {
    const layout = useFormLayout()
    const options = {
      columnGap: layout?.gridColumnGap ?? 8,
      rowGap: layout?.gridRowGap ?? 4,
      ...props,
    }
    const grid = useMemo(
      () => markRaw(options?.grid ? options.grid : new Grid(options)),
      [Grid.id(options)]
    )
    const prefixCls = usePrefixCls('formily-grid', props)

    const [wrapSSR, hashId] = useStyle(prefixCls)
    const dataProps = pickDataProps(props)
    const connect = useCallback(
      (element: HTMLDivElement | null) => {
        if (!element) return
        const dispose = grid.connect(element)
        element.style.gridTemplateColumns = grid.templateColumns
        return dispose
      },
      [grid]
    )
    return (
      <FormGridContext.Provider value={grid}>
        {wrapSSR(
          <div
            {...dataProps}
            className={cls(`${prefixCls}-layout`, hashId, className)}
            style={{
              ...style,
              gridTemplateColumns: grid.templateColumns,
              gap: grid.gap,
            }}
            ref={connect}
          >
            {children}
          </div>
        )}
      </FormGridContext.Provider>
    )
  },
  {
    forwardRef: true,
  }
)

export const GridColumn: React.FC<React.PropsWithChildren<IGridColumnProps>> =
  observer(({ gridSpan = 1, children, ...props }) => {
    return (
      <div
        {...props}
        style={{
          gridColumn: gridSpan === -1 ? '1 / -1' : `span ${gridSpan} / auto`,
          ...props.style,
        }}
        data-grid-span={gridSpan}
      >
        {children}
      </div>
    )
  })

export const FormGrid = Object.assign(InternalFormGrid, {
  createFormGrid,
  useFormGrid,
  GridColumn,
})

export default FormGrid
