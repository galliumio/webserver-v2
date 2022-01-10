/*******************************************************************************
 * Copyright (C) Gallium Studio LLC. All rights reserved.
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
import { makeStyles } from '@material-ui/core/styles'
import {NodeList} from './NodeList.js'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'
import {ColorTextInput} from './ColorTextInput.js'
import TextField from '@material-ui/core/TextField'

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
        paddingBottom: '20px',
    },
    textField: {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        width: 150,
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
class SensorSendClicked extends Evt {
    constructor(controlData, nodes) {
        super('SensorSendClicked')
        this.controlData = controlData
        this.nodes = nodes
    }
}
  
export function MainSensorTab({hsm, hsm:{ctx:{model}}, show}) {
    const [checked, setChecked] = useState([])
    const [controlData, setControlData] = useState({
        threshold: {pitch:'30', roll:'20'}
    })

    const {disableUi} = model
    const classes = useStyles()

    const onSubmit = (event)=>{
        event.preventDefault()
        hsm.log(`send clicked. controlData = `, controlData)
        hsm.log('send SensorSendClicked event to ', hsm.name)
        // @todo Add validation.
        // @todo Test nodes is correct.
        const nodes = model.mainStatusData.map(node=>node.nodeId).filter(id=>checked.includes(id))
        hsm.send(new SensorSendClicked(controlData, nodes), hsm.name)
    }

    const onChange = {
        pitchThres: (value)=>{
            const newData = {...controlData}
            newData.threshold.pitch = value
            setControlData(newData)
        },
        rollThres: (value)=>{
            const newData = {...controlData}
            newData.threshold.roll = value
            setControlData(newData)
        },
    }

    // In NodeList, it creates a new array for the "checked" property to avoid passing down the array in its "state",
    // in case the child changes its property directly. 
    if (!show) {
        return (<div></div>)
    }
    return (
        <TabContainer>
            <h1>SENSOR</h1>
            <NodeList hsm={hsm} checked={[...checked]} onUpdate={setChecked}></NodeList>
            {[...model.sensorData.entries()].filter(([nodeId])=>checked.includes(nodeId)).map(([nodeId, data])=>{
                return (
                    <div key={nodeId}>
                        <p>{nodeId}</p>
                        <div className={classes.container}>
                            <TextField className={classes.textField} label={'Pitch'} value={data.pitch.toFixed(2)} variant="outlined"/>
                            <TextField className={classes.textField} label={'Roll'} value={data.roll.toFixed(2)} variant="outlined"/>
                        </div>  
                    </div>)
            })}
            <form noValidate autoComplete="off" onSubmit={onSubmit}>
                <br/>
                <p>Threshold Settings</p>
                <div className={classes.container}>
                    <TextField className={classes.textField} label={'Pitch Threshold'} value={controlData.threshold.pitch} 
                        onChange={(event)=>{onChange.pitchThres(event.target.value)}} variant="outlined"/>
                    <TextField className={classes.textField} label={'Roll Threshold'} value={controlData.threshold.roll} 
                        onChange={(event)=>{onChange.rollThres(event.target.value)}} variant="outlined"/>
                </div>
                <Button type="submit" variant="contained" color="primary" className={classes.button} disabled={disableUi}>
                    Send
                </Button>
            </form>
        </TabContainer>
    )
}

