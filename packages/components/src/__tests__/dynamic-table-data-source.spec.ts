import {
  DYNAMIC_TABLE_READ_ONLY_MARKER,
  applyDynamicTableDataSourceToSchema,
  applyDynamicTableFieldRole,
  applyDynamicTableFieldRolesToSchema,
  applyDynamicTableRowSelection,
  buildDynamicTableValueOption,
  clearDynamicTableMappedFields,
  getDynamicTableFieldRole,
  getDynamicTableRowKeyTargetField,
  mapDynamicTableRow,
} from '../array-table/dynamic-data-source'

const config = {
  fieldMappings: [
    { sourceField: 'id', targetField: 'sourceId' },
    { label: '产品编码', sourceField: 'code', targetField: 'productCode' },
    { label: '产品名称', sourceField: 'name', targetField: 'productName' },
  ],
  rowKey: 'id',
}

describe('dynamic table data source', () => {
  it('classifies the selector, mapped fields and custom fields', () => {
    expect(getDynamicTableRowKeyTargetField(config)).toBe('sourceId')
    expect(getDynamicTableFieldRole(config, 'sourceId')).toBe('selector')
    expect(getDynamicTableFieldRole(config, 'productName')).toBe('mapped')
    expect(getDynamicTableFieldRole(config, 'remark')).toBe('unmapped')
    expect(
      getDynamicTableFieldRole(
        {
          ...config,
          fieldMappings: [
            ...config.fieldMappings,
            { sourceField: 'id', targetField: 'duplicateId' },
          ],
        },
        'duplicateId'
      )
    ).toBe('mapped')
  })

  it('maps and clears only configured fields', () => {
    expect(
      mapDynamicTableRow(config, { id: 1, code: 'P-1', name: '产品 A' })
    ).toEqual({
      productCode: 'P-1',
      productName: '产品 A',
      sourceId: 1,
    })
    expect(
      clearDynamicTableMappedFields(config, {
        productCode: 'P-1',
        productName: '产品 A',
        remark: '保留',
        sourceId: 1,
      })
    ).toEqual({ remark: '保留' })
  })

  it('merges a selected source record into a row while preserving custom fields', () => {
    expect(
      applyDynamicTableRowSelection(
        config,
        { sourceId: 9, productName: '旧值', remark: '保留' },
        { id: 1, code: 'P-1', name: '产品 A' }
      )
    ).toEqual({
      sourceId: 1,
      productCode: 'P-1',
      productName: '产品 A',
      remark: '保留',
    })
  })

  it('uses a mapped business field as the existing selection label', () => {
    expect(
      buildDynamicTableValueOption(
        config,
        { productName: '产品 A', sourceId: 1 },
        1
      )
    ).toEqual({ label: '产品 A', value: 1 })
    expect(
      buildDynamicTableValueOption(
        config,
        { id: 1, code: 'P-1', name: '产品 A' },
        1
      )
    ).toEqual({ label: '产品 A', value: 1 })
  })

  it('marks only implicit mapped fields as read only', () => {
    const implicit: Record<string, any> = {}
    applyDynamicTableFieldRole(implicit, 'mapped')
    expect(implicit).toEqual({
      [DYNAMIC_TABLE_READ_ONLY_MARKER]: true,
      'x-pattern': 'readOnly',
    })

    const explicit = { 'x-pattern': 'editable' }
    applyDynamicTableFieldRole(explicit, 'mapped')
    expect(explicit).toEqual({ 'x-pattern': 'editable' })

    const disabled = { disabled: true }
    applyDynamicTableFieldRole(disabled, 'unmapped')
    expect(disabled).toEqual({ disabled: true })
  })

  it('removes only an automatically applied read-only state', () => {
    const automatic: Record<string, any> = {}
    applyDynamicTableFieldRole(automatic, 'mapped')
    applyDynamicTableFieldRole(automatic, 'selector')
    expect(automatic).toEqual({})

    const explicit = { disabled: true, 'x-pattern': 'readOnly' }
    applyDynamicTableFieldRole(explicit, 'selector')
    expect(explicit).toEqual({ disabled: true, 'x-pattern': 'readOnly' })
  })

  it('applies and removes automatic read-only state in a schema tree', () => {
    const schema = {
      items: {
        properties: {
          sourceId: { 'x-pattern': 'editable' },
          productName: {},
          remark: {},
        },
      },
    }

    applyDynamicTableFieldRolesToSchema(schema, config)
    expect(schema.items.properties.productName['x-pattern']).toBe('readOnly')
    expect(schema.items.properties.remark['x-pattern']).toBeUndefined()
    expect(schema.items.properties.sourceId['x-pattern']).toBe('editable')

    delete schema.items.properties.productName['x-pattern']
    applyDynamicTableFieldRolesToSchema(schema, {
      ...config,
      fieldMappings: config.fieldMappings.filter(
        (mapping) => mapping.targetField !== 'productName'
      ),
    })
    expect(schema.items.properties.productName['x-pattern']).toBeUndefined()
  })

  it('converts a runtime schema without changing custom fields', () => {
    const schema = {
      properties: {
        unrelated: { 'x-component': 'Input' },
        materials: {
          'x-component': 'ArrayTable',
          items: {
            properties: {
              sourceId: { 'x-component': 'Input' },
              productName: { 'x-component': 'Input' },
              remark: { 'x-component': 'Input' },
            },
          },
        },
      },
    }

    applyDynamicTableDataSourceToSchema(schema, config, {
      rowSelectComponent: 'RuntimeDynamicTableRowSelect',
      rowSelectComponentProps: { runtimeDataSourceContext: { formId: 1 } },
    })

    expect(schema.properties.unrelated['x-component']).toBe('Input')
    expect(schema.properties.materials.items.properties.sourceId).toMatchObject(
      {
        'x-component': 'RuntimeDynamicTableRowSelect',
        'x-component-props': {
          dynamicDataSource: config,
          runtimeDataSourceContext: { formId: 1 },
        },
      }
    )
    expect(
      schema.properties.materials.items.properties.productName['x-pattern']
    ).toBe('readOnly')
    expect(
      schema.properties.materials.items.properties.remark['x-pattern']
    ).toBeUndefined()
  })

  it('leaves a schema unchanged when no dynamic data source is configured', () => {
    const schema = {
      items: {
        properties: {
          sourceId: { 'x-component': 'Input' },
          remark: { 'x-pattern': 'editable' },
        },
      },
    }
    const snapshot = JSON.parse(JSON.stringify(schema))

    expect(applyDynamicTableDataSourceToSchema(schema)).toBe(schema)
    expect(schema).toEqual(snapshot)
  })
})
