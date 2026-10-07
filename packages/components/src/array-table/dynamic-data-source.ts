export type DynamicTableFieldMapping = {
  label?: string
  sourceField: string
  targetField: string
}

export type DynamicTableDataSourceConfig = {
  fieldMappings: DynamicTableFieldMapping[]
  rowKey: string
}

export type DynamicTableFieldRole = 'mapped' | 'selector' | 'unmapped'

export const DYNAMIC_TABLE_READ_ONLY_MARKER = 'x-dynamic-table-mapped-read-only'

export const getDynamicTableFieldRole = (
  config: DynamicTableDataSourceConfig,
  targetField: string
): DynamicTableFieldRole => {
  const mapping = config.fieldMappings.find(
    (item) => item.targetField === targetField
  )

  if (!mapping) return 'unmapped'
  return mapping.targetField === getDynamicTableRowKeyTargetField(config)
    ? 'selector'
    : 'mapped'
}

export const getDynamicTableRowKeyTargetField = (
  config: DynamicTableDataSourceConfig
) =>
  config.fieldMappings.find((mapping) => mapping.sourceField === config.rowKey)
    ?.targetField

export const applyDynamicTableFieldRole = (
  fieldSchema: Record<string, any>,
  role: DynamicTableFieldRole
) => {
  const automaticallyReadOnly =
    fieldSchema[DYNAMIC_TABLE_READ_ONLY_MARKER] === true

  if (role === 'mapped') {
    if (fieldSchema['x-pattern'] == null || automaticallyReadOnly) {
      fieldSchema['x-pattern'] = 'readOnly'
      fieldSchema[DYNAMIC_TABLE_READ_ONLY_MARKER] = true
    }
    return fieldSchema
  }

  if (automaticallyReadOnly) {
    delete fieldSchema['x-pattern']
    delete fieldSchema[DYNAMIC_TABLE_READ_ONLY_MARKER]
  }

  return fieldSchema
}

export const mapDynamicTableRow = (
  config: DynamicTableDataSourceConfig,
  item: Record<string, unknown>
) =>
  config.fieldMappings.reduce<Record<string, unknown>>((row, mapping) => {
    if (item[mapping.sourceField] !== undefined) {
      row[mapping.targetField] = item[mapping.sourceField]
    }
    return row
  }, {})

export const applyDynamicTableRowSelection = (
  config: DynamicTableDataSourceConfig,
  currentRow: unknown,
  item: Record<string, unknown>
) => ({
  ...(currentRow && typeof currentRow === 'object'
    ? (currentRow as Record<string, unknown>)
    : {}),
  ...mapDynamicTableRow(config, item),
})

export const clearDynamicTableMappedFields = (
  config: DynamicTableDataSourceConfig,
  row: unknown
) => {
  const targetFields = new Set(
    config.fieldMappings.map((mapping) => mapping.targetField)
  )

  return Object.fromEntries(
    Object.entries(
      row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    ).filter(([fieldName]) => !targetFields.has(fieldName))
  )
}

const getDynamicTableOptionLabelMapping = (
  config: DynamicTableDataSourceConfig
) => {
  const nonKeyMappings = config.fieldMappings.filter(
    (mapping) => mapping.sourceField !== config.rowKey
  )

  return (
    nonKeyMappings.find((mapping) =>
      /(name|title|名称|标题)/i.test(
        `${mapping.sourceField} ${mapping.label || ''}`
      )
    ) ||
    nonKeyMappings.find((mapping) =>
      /(code|编码)/i.test(`${mapping.sourceField} ${mapping.label || ''}`)
    ) ||
    nonKeyMappings[0] ||
    config.fieldMappings.find(
      (mapping) => mapping.sourceField === config.rowKey
    )
  )
}

export const buildDynamicTableValueOption = (
  config: DynamicTableDataSourceConfig,
  row: unknown,
  value: unknown
) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined

  const labelMapping = getDynamicTableOptionLabelMapping(config)
  const record =
    row && typeof row === 'object'
      ? (row as Record<string, unknown>)
      : undefined
  const label = labelMapping
    ? record?.[labelMapping.targetField] ?? record?.[labelMapping.sourceField]
    : undefined

  return {
    label: String(label ?? value),
    value,
  }
}

export const applyDynamicTableFieldRolesToSchema = (
  schema: Record<string, any>,
  config: DynamicTableDataSourceConfig
) => {
  const visit = (node: Record<string, any>, propertyName = '') => {
    const name =
      typeof node.name === 'string' && node.name.length > 0
        ? node.name
        : propertyName
    if (name) {
      applyDynamicTableFieldRole(node, getDynamicTableFieldRole(config, name))
    }

    if (node.properties && typeof node.properties === 'object') {
      Object.entries(node.properties).forEach(([childName, child]) => {
        if (child && typeof child === 'object') {
          visit(child as Record<string, any>, childName)
        }
      })
    }

    if (node.items && typeof node.items === 'object') {
      const items = Array.isArray(node.items) ? node.items : [node.items]
      items.forEach((item) => {
        if (item && typeof item === 'object') visit(item as Record<string, any>)
      })
    }
  }

  visit(schema)
  return schema
}

export type DynamicTableSchemaRuntimeOptions = {
  rowSelectComponent?: string
  rowSelectComponentProps?: Record<string, unknown>
}

export const applyDynamicTableDataSourceToSchema = (
  schema: Record<string, any>,
  config?: DynamicTableDataSourceConfig,
  options: DynamicTableSchemaRuntimeOptions = {}
) => {
  if (!config) return schema

  const rowKeyTargetField = getDynamicTableRowKeyTargetField(config)
  const rowSelectComponent =
    options.rowSelectComponent || 'DynamicTableRowSelect'

  const visit = (
    node: Record<string, any>,
    propertyName = '',
    insideArrayTable = false
  ) => {
    const isArrayTable = node['x-component'] === 'ArrayTable'
    const inTable = insideArrayTable || isArrayTable
    const name =
      typeof node.name === 'string' && node.name.length > 0
        ? node.name
        : propertyName
    if (inTable && !isArrayTable) {
      const role = getDynamicTableFieldRole(config, name)
      applyDynamicTableFieldRole(node, role)

      if (name === rowKeyTargetField) {
        node['x-component'] = rowSelectComponent
        node['x-component-props'] = {
          ...(node['x-component-props'] || {}),
          ...options.rowSelectComponentProps,
          dynamicDataSource: config,
        }
      }
    }

    if (node.properties && typeof node.properties === 'object') {
      Object.entries(node.properties).forEach(([childName, child]) => {
        if (child && typeof child === 'object') {
          visit(child as Record<string, any>, childName, inTable)
        }
      })
    }

    if (node.items && typeof node.items === 'object') {
      const items = Array.isArray(node.items) ? node.items : [node.items]
      items.forEach((item) => {
        if (item && typeof item === 'object') {
          visit(item as Record<string, any>, '', inTable)
        }
      })
    }
  }

  visit(schema)
  return schema
}
