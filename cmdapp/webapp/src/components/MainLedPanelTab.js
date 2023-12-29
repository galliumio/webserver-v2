/*******************************************************************************
 * Copyright (C) 2018 Gallium Studio LLC (Lawrence Lo). All rights reserved.
 *
 * This program is open source software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Alternatively, this program may be distributed and modified under the
 * terms of Gallium Studio LLC commercial licenses, which expressly supersede
 * the GNU General Public License and are specifically designed for licensees
 * interested in retaining the proprietary status of their code.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Contact information:
 * Website - https://www.galliumstudio.com
 * Source repository - https://github.com/galliumstudio
 * Email - admin@galliumstudio.com
 ******************************************************************************/

import React, { useState } from 'react'
import makeStyles from '@mui/styles/makeStyles';
import {NodeList} from './NodeList.js'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import {ColorTextInput} from './ColorTextInput.js'

let {Evt, ErrorEvt} = require("../../../../galliumstudio/lib/index.js")

const useStyles = makeStyles((theme) => ({
    root: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
    container: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    button: {
        margin: theme.spacing(1),
    },
}));

function TabContainer({children}) {
    return (
      <Typography component="div" style={{ padding: 0 }}>
        {children}
      </Typography>
    );
}

// Internal events
class LedPanelSendClicked extends Evt {
    constructor(tickerData, nodes) {
        super('LedPanelSendClicked')
        this.tickerData = tickerData
        this.nodes = nodes
    }
}
  
export function MainLedPanelTab({hsm, hsm:{ctx:{model}}, show}) {
    const [checked, setChecked] = useState([])
    //const [fgColor, setFgColor] = useState({r:'255', g:'0', b:'0', a:'1'})
    //const [bgColor, setBgColor] = useState({r:'0', g:'0', b:'255', a:'1'})
    //const [text, setText] = useState('')

    const tickerCnt = 6
    //const defaultTickerData = ()=>{
    //    return [...Array(tickerCnt)].map(x=>({
    //        fgColor: {r:'255', g:'0', b:'0', a:'1'},
    //        bgColor: {r:'0', g:'0', b:'255', a:'1'},
    //        text: ''
    //    }))
    //}
    const [tickerData, setTickerData] = useState([...Array(tickerCnt)].map(x=>({
        fgColor: {r:'255', g:'0', b:'0', a:'1'},
        bgColor: {r:'0', g:'0', b:'255', a:'1'},
        text: ''
    })))

    const {disableUi} = model
    const classes = useStyles()

    const onSubmit = (event)=>{
        event.preventDefault()
        //hsm.log(`send clicked. tickerData = `, tickerData)
        const nodes = model.mainStatusData.map(node=>node.nodeId).filter(id=>checked.includes(id))
        hsm.send(new LedPanelSendClicked(tickerData, nodes), hsm.name)
    }

    const onChange = (i)=>({
        onFgColorChange: (color)=>{
            const newData = [...tickerData]
            newData[i].fgColor = color
            setTickerData(newData)
        },
        onBgColorChange: (color)=>{
            const newData = [...tickerData]
            newData[i].bgColor = color
            setTickerData(newData)
        },
        onTextChange: (text)=>{
            const newData = [...tickerData]
            newData[i].text = text
            setTickerData(newData)
        }
    })

    // In NodeList, it creates a new array for the "checked" property to avoid passing down the array in its "state",
    // in case the child changes its property directly. 
    if (!show) {
        return (<div></div>)
    }
    return (
        <TabContainer>
            <h1>LED PANEL</h1>
            <NodeList hsm={hsm} checked={[...checked]} onUpdate={setChecked}></NodeList>
            <form noValidate autoComplete="off" onSubmit={onSubmit}>
                {tickerData.map((data, i)=>(
                     <ColorTextInput key={i} hsm={hsm} label={`Ticker ${i+1}`} data={data} onChange={onChange(i)}/>
                ))}
                <Button type="submit" variant="contained" color="primary" className={classes.button} disabled={disableUi}>
                    Send
                </Button>
            </form>
        </TabContainer>
    )
}

