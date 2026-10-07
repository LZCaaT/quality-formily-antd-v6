import { LoadingOutlined } from '@ant-design/icons'
import { connect, mapProps, mapReadPretty, ReactFC } from '@formily/react'
import { Input as AntdInput, Space, type InputProps, type InputRef } from 'antd'
import React from 'react'
import { PreviewText } from '../preview-text'

const CompactInput = React.forwardRef<InputRef, InputProps>(
  ({ addonBefore, addonAfter, style, ...props }, ref) => {
    if (addonBefore == null && addonAfter == null) {
      return <AntdInput {...props} ref={ref} style={style} />
    }
    return (
      <Space.Compact block style={style}>
        {addonBefore != null && <Space.Addon>{addonBefore}</Space.Addon>}
        <AntdInput {...props} ref={ref} />
        {addonAfter != null && <Space.Addon>{addonAfter}</Space.Addon>}
      </Space.Compact>
    )
  }
)

CompactInput.displayName = 'CompactInput'

const InternalInput: ReactFC<InputProps> = connect(
  CompactInput,
  mapProps((props, field) => {
    return {
      ...props,
      suffix: (
        <span>
          {field?.['loading'] || field?.['validating'] ? (
            <LoadingOutlined />
          ) : (
            props.suffix
          )}
        </span>
      ),
    }
  }),
  mapReadPretty(PreviewText.Input)
)
const TextArea = connect(AntdInput.TextArea, mapReadPretty(PreviewText.Input))

export const Input = Object.assign(InternalInput, {
  TextArea,
})

export default Input
