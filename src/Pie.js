/*
Copyright 2016 Capital One Services, LLC
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.

SPDX-Copyright: Copyright (c) Capital One Services, LLC
SPDX-License-Identifier: Apache-2.0
*/

import React, {Component} from 'react'
import {Text as ReactText}  from 'react-native'
import Svg,{ G, Path, Text, Circle} from 'react-native-svg'
import { Colors, Options, cyclic, identity, fontAdapt } from './util'
import sector from 'paths-js/sector'
import linear from 'paths-js/linear'
import ops from 'paths-js/ops'
import _ from 'lodash'
import 'babel-polyfill'
const Pie = require('paths-js/pie')

export default class PieChart extends Component {

  static defaultProps = {
    options: {
      margin: {top: 20, left: 20, right: 20, bottom: 20},
      width: 600,
      height: 600,
      color: '#2980B9',
      r: 100,
      R: 200,
      legendPosition: 'topLeft',
      animate: {
        type: 'oneByOne',
        duration: 200,
        fillTransition: 3
      },
      label: {
        fontFamily: 'Arial',
        fontSize: 14,
        bold: true,
        color: '#ECF0F1'
      }
    },
  }

  constructor(props) {
    super(props);

    this.state = {
      hover:-1,
      selected: props.selected,
    };
  }

  color(i) {
    let color = this.props.color || (this.props.options && this.props.options.color)
    if (Array.isArray(color)) {
      if (i >= color.length) {
        const pallete = Colors.mix(color[i % color.length])
        return Colors.string(cyclic(pallete, i))
      }
      return color[i];
    } else {
      if (color && !_.isString(color)) color = color.color
      let pallete = this.props.pallete || (this.props.options && this.props.options.pallete) || Colors.mix(color || '#9ac7f7')
      return Colors.string(cyclic(pallete, i))
    }
  }

  get defaultRange() {
    return _.map(Array(this.props.data && this.props.data.length),function(){return 0})
  }

  render() {
    const noDataMsg = this.props.noDataMessage || 'No data available'
    if (this.props.data === undefined) return (<ReactText>{noDataMsg}</ReactText>)

    let options = new Options(this.props)

    let x = (options.chartWidth / 2) - (options.margin.left || 0)
    let y = (options.chartHeight / 2) - (options.margin.top || 0)

    let radius = Math.min(x, y)

    let r = this.props.r
    r = (isNaN(r) ? (this.props.options && this.props.options.r) : r)
    r = (isNaN(r) ? (radius / 2) : r)

    let sr = this.props.sr
    sr = (sr || (this.props.options && this.props.options.sr))
    sr = (sr || r)

    let R = this.props.R
    R = (R || (this.props.options && this.props.options.R))
    R = (R || radius)

    let SR = this.props.SR
    SR = (SR || (this.props.options && this.props.options.SR))
    SR = (SR || R)

    let [centerX, centerY] = this.props.center || (this.props.options && this.props.options.center) || [x, y]

    let textStyle = fontAdapt(options.label)

    let slices
    let highlightColor = this.props.options.highlightColor == null ? '#999999':this.props.options.highlightColor

    if (this.props.data.length === 1) {
      let item = this.props.data[0]
      let outerFill = (item.color && Colors.string(item.color)) || this.color(0)
      let innerFill = this.props.monoItemInnerFillColor || '#fff'
      let stroke = typeof fill === 'string' ? outerFill : Colors.darkenColor(outerFill)
      slices = (
        <G>
          <Circle
            r={R}
            cx={centerX}
            cy={centerY}
            stroke={stroke}
            fill={ this.state.hover === 0 ? highlightColor:outerFill}
            onPressIn={ this._onPressItem.bind(this, 0) }
            onPressOut={ this._onPressItemOut.bind(this) } />
          <Circle r={r} cx={centerX} cy={centerY} stroke={stroke} fill={innerFill}/>
          <Text fontFamily={textStyle.fontFamily}
                fontSize={textStyle.fontSize}
                fontWeight={textStyle.fontWeight}
                fontStyle={textStyle.fontStyle}
                fill={textStyle.fill}
                textAnchor="middle"
                x={centerX}
                y={centerY - R + ((R-r)/2)}>{item.name}</Text>
        </G>
      )
    } else {
      const accessor = this.props.accessor || identity(this.props.accessorKey);
      let chart = Pie({
        center: [centerX, centerY],
        r,
        R,
        data: this.props.data,
        accessor,
      });
      let t = 0;
      const values = this.props.data.map(accessor);
      const scale = linear([0, ops.sum(values)], [0, 2 * Math.PI]);
      slices = chart.curves.map( (c, i) => {
        if(i === this.state.selected) {
          c.sector = sector({
            center: [centerX, centerY],
            r: sr,
            R: SR,
            start: scale(t),
            end: scale(t + values[i])
          });
        }
        t += values[i];
        let fill = (c.item.color && Colors.string(c.item.color)) || this.color(i)
        let stroke = typeof fill === 'string' ? fill : Colors.darkenColor(fill)
        return (
                  <G key={ i }>
                      <Path
                        d={c.sector.path.print() }
                        stroke={stroke}
                        fill={ this.state.hover==i ? highlightColor:fill }
                        fillOpacity={1}
                        onPressIn={ this._onPressItem.bind(this, i) }
                        onPressOut={ this._onPressItemOut.bind(this) }  />
                      <G x={options.margin.left} y={options.margin.top}>
                        <Text fontFamily={textStyle.fontFamily}
                              fontSize={textStyle.fontSize}
                              fontWeight={textStyle.fontWeight}
                              fontStyle={textStyle.fontStyle}
                              fill={textStyle.fill}
                              textAnchor="middle"
                              x={c.sector.centroid[0]}
                              y={c.sector.centroid[1]}>{ c.item.name }</Text>
                      </G>
                  </G>
              )
      })
    }

    let returnValue = <Svg width={options.width} height={options.height}>
            <G x={options.margin.left} y={options.margin.top}>
                { slices }
            </G>
          </Svg>

    return returnValue
  }

  _onPressItemOut() {
    this.setState({
        hover:-1,
    });
  }

  _onPressItem(index) {
    this.setState({
        hover:index,
        selected: index,
    }, () => {
      if (this.props.chartCallback != null) {
        this.props.chartCallback(index);
      }
    });
  }

}
