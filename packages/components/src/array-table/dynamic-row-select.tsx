import { connect, observer, useField } from '@formily/react'
import type { Field } from '@formily/core'
import type { SelectProps } from 'antd'
import { Select } from 'antd'
import React from 'react'
import {
  applyDynamicTableRowSelection,
  buildDynamicTableValueOption,
  clearDynamicTableMappedFields,
  type DynamicTableDataSourceConfig,
} from './dynamic-data-source'

export type DynamicTableRecordQuery = (params: {
  context?: unknown
  keyword?: string
  page: number
  pageSize: number
  signal?: AbortSignal
}) => Promise<Record<string, unknown>[] | { items: Record<string, unknown>[] }>

export type DynamicTableRowSelectProps = Omit<SelectProps<any>, 'options'> & {
  dynamicDataSource?: DynamicTableDataSourceConfig
  queryRecords?: DynamicTableRecordQuery
  runtimeDataSourceContext?: unknown
}

const getRowPath = (field: { path: { toString: () => string } }) => {
  const segments = field.path.toString().split('.').filter(Boolean)
  return segments.slice(0, -1).join('.')
}

const DynamicTableRowSelectInner = observer(
  ({
    dynamicDataSource,
    queryRecords,
    runtimeDataSourceContext,
    ...props
  }: DynamicTableRowSelectProps) => {
    const field = useField<Field<any, any, any, any>>()
    const [loading, setLoading] = React.useState(false)
    const [options, setOptions] = React.useState<
      Array<{ label: string; value: string | number }>
    >([])
    const recordsRef = React.useRef(new Map<string, Record<string, unknown>>())
    const abortRef = React.useRef<AbortController | undefined>(undefined)
    const searchTimerRef = React.useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined)
    const rowPath = getRowPath(field)
    const row = rowPath ? field.form.getValuesIn(rowPath) : undefined
    const currentOption = dynamicDataSource
      ? buildDynamicTableValueOption(dynamicDataSource, row, field.value)
      : undefined
    const displayOptions = currentOption
      ? [
          currentOption,
          ...options.filter(
            (option) => String(option.value) !== String(currentOption.value)
          ),
        ]
      : options

    const loadOptions = (keyword?: string) => {
      if (!dynamicDataSource || !queryRecords) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      void queryRecords({
        context: runtimeDataSourceContext,
        keyword,
        page: 1,
        pageSize: 100,
        signal: controller.signal,
      })
        .then((result) => {
          const records = Array.isArray(result) ? result : result.items
          const nextOptions = records.flatMap((record) => {
            const value = record[dynamicDataSource.rowKey]
            if (typeof value !== 'string' && typeof value !== 'number')
              return []
            recordsRef.current.set(String(value), record)
            const option = buildDynamicTableValueOption(
              dynamicDataSource,
              record,
              value
            )
            return option ? [option] : []
          })
          setOptions(nextOptions)
          field.setSelfWarnings([])
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            field.setSelfWarnings([
              error instanceof Error ? error.message : '数据源加载失败',
            ])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }

    React.useEffect(
      () => () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        abortRef.current?.abort()
      },
      []
    )

    const readOnly =
      field.pattern === 'readOnly' ||
      field.pattern === 'disabled' ||
      field.pattern === 'readPretty' ||
      props.disabled === true

    if (field.pattern === 'readPretty') {
      return (
        <span className="ant-form-text">{currentOption?.label ?? '暂无'}</span>
      )
    }

    return (
      <Select
        {...props}
        allowClear
        disabled={readOnly}
        loading={loading || props.loading}
        options={displayOptions}
        placeholder={props.placeholder || '请选择关联数据'}
        showSearch={{
          filterOption: false,
          onSearch: (keyword) => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
            searchTimerRef.current = setTimeout(
              () => loadOptions(keyword.trim() || undefined),
              250
            )
          },
        }}
        onChange={(value, option) => {
          props.onChange?.(value, option)
          if (!dynamicDataSource || !rowPath) return

          if (value === undefined || value === null || value === '') {
            field.form.setValuesIn(
              rowPath,
              clearDynamicTableMappedFields(
                dynamicDataSource,
                field.form.getValuesIn(rowPath)
              )
            )
            return
          }

          const record = recordsRef.current.get(String(value))
          if (record) {
            field.form.setValuesIn(rowPath, {
              ...applyDynamicTableRowSelection(
                dynamicDataSource,
                field.form.getValuesIn(rowPath),
                record
              ),
            })
          }
        }}
        onOpenChange={(open) => {
          props.onOpenChange?.(open)
          if (open && options.length < 1) loadOptions()
        }}
      />
    )
  }
)

export const DynamicTableRowSelect = connect(DynamicTableRowSelectInner)

export default DynamicTableRowSelect
