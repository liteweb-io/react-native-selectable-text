import React from 'react'
import { Text, requireNativeComponent, Platform } from 'react-native'
import { v4 } from 'uuid'
import memoize from 'fast-memoize'

const RNSelectableText = requireNativeComponent('RNSelectableText')

/**
 * numbers: array({start: int, end: int, id: string})
 */
const combineHighlights = memoize(numbers => {
  return numbers
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .reduce(function (combined, next) {
      if (!combined.length || combined[combined.length - 1].end < next.start) combined.push(next)
      else {
        var prev = combined.pop()
        combined.push({
          start: prev.start,
          end: Math.max(prev.end, next.end),
          id: next.id,
        })
      }
      return combined
    }, [])
})

/**
 * value: string
 * highlights: array({start: int, end: int, id: any})
 */
const mapHighlightsRanges = (value, highlights) => {
  const combinedHighlights = combineHighlights(highlights)

  if (combinedHighlights.length === 0) return [{ isHighlight: false, text: value }]

  const data = [{ isHighlight: false, text: value.slice(0, combinedHighlights[0].start) }]

  combinedHighlights.forEach(({ start, end }, idx) => {
    data.push({
      isHighlight: true,
      text: value.slice(start, end),
    })

    if (combinedHighlights[idx + 1]) {
      data.push({
        isHighlight: false,
        text: value.slice(end, combinedHighlights[idx + 1].start),
      })
    }
  })

  data.push({
    isHighlight: false,
    text: value.slice(combinedHighlights[combinedHighlights.length - 1].end, value.length),
  })

  return data.filter(x => x.text)
}

const mapBolds = (value, font) => {
  const bolds = value.match(/\<b\>[a-zA-Z0-9_ .%!?",/ąęóśźżćłńĄĘÓŚŻŹĆŁŃ–-]*\<\/b\>/g);
  const split = value.split(/\<b\>[a-zA-Z0-9_ .%!?",/ąęóśźżćłńĄĘÓŚŻŹĆŁŃ–-]*\<\/b\>/g);
  return (
    <Text allowFontScaling={false} selectable>
      {
        split.map((i, index) => {
          if (bolds && bolds[index]) {
            return (
              <Text allowFontScaling={false} selectable key={v4()}>
                {i}
                <Text allowFontScaling={false} selectable style={{ fontFamily: font }}>{bolds[index].substring(3, bolds[index].length - 4)}</Text>
              </Text>
            )
          } else {
            return (
              <Text allowFontScaling={false} selectable key={v4()}>
                {i}
              </Text>
            )
          }
        })
      }
    </Text>
  )
}

/**
 * Props
 * ...TextProps
 * onSelection: ({ content: string, eventType: string, selectionStart: int, selectionEnd: int }) => void
 * children: ReactNode
 * highlights: array({ id, start, end })
 * highlightColor: string
 * onHighlightPress: string => void
 */
export const SelectableText = ({ onSelection, onHighlightPress, value, children, ...props }) => {
  const onSelectionNative = ({
    nativeEvent: { content, eventType, selectionStart, selectionEnd },
  }) => {
    onSelection && onSelection({ content, eventType, selectionStart, selectionEnd })
  }

  const onHighlightPressNative = onHighlightPress
    ? Platform.OS === 'ios'
      ? ({ nativeEvent: { clickedRangeStart, clickedRangeEnd } }) => {
        if (!props.highlights || props.highlights.length === 0) return

        const hightlightInRange = props.highlights.find(
          ({ start, end, brStart, brEnd }) => clickedRangeStart >= (start - brStart) - 1 && clickedRangeEnd <= (end - brEnd) + 1,
        )
        console.log('SIgma', hightlightInRange, props.highlights)
        console.log('SIgmaRange', clickedRangeStart, clickedRangeEnd)
        if (hightlightInRange) {
          onHighlightPress(hightlightInRange.id, clickedRangeStart, clickedRangeEnd)
        }
      }
      : onHighlightPress
    : () => { }

  return (
    <RNSelectableText
      {...props}
      onHighlightPress={onHighlightPressNative}
      selectable
      onSelection={onSelectionNative}
    >
      <Text allowFontScaling={false} selectable key={v4()}>
        {props.highlights && props.highlights.length > 0
          ? mapHighlightsRanges(value, props.highlights).map(({ id, isHighlight, text }) => (
            <Text
              allowFontScaling={false}
              key={v4()}
              selectable
              style={
                isHighlight
                  ? {
                    backgroundColor: props.highlightColor,
                  }
                  : {}
              }
              onPress={() => {
                if (isHighlight) {
                  onHighlightPress && onHighlightPress(id)
                }
              }}
            >
              {mapBolds(text, props.boldFont)}
            </Text>
          ))
          : mapBolds(value, props.boldFont)}
        {props.appendToChildren ? props.appendToChildren : null}
      </Text>
    </RNSelectableText>
  )
}
