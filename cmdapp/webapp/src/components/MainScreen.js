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

import React from 'react'
import makeStyles from '@mui/styles/makeStyles';
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import {MainStatusTab} from './MainStatusTab'
import {MainConsoleTab} from './MainConsoleTab'
import {MainSensorTab} from './MainSensorTab'
import {MainLedPanelTab} from './MainLedPanelTab'
let {Evt, ErrorEvt} = require("../../../../galliumstudio/lib/index.js")

const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
        width: '100%',
        backgroundColor: theme.palette.background.paper,
    },
}));

// Enum for MainScreen tab index.
export const MAIN_TAB = Object.freeze({
    STATUS:     0,
    CONSOLE:    1,
    SENSOR:     2,
    LED_PANEL:  3,
})

// Internal events
class MainTabChanged extends Evt {
    constructor(index) {
        super('MainTabChanged')
        this.index = index        // Tab index defined in MAIN_TAB
    }
}

export function MainScreen({hsm, hsm:{ctx:{model}}}) {
    const onChange = (event, value)=>{
        hsm.log(`MainTab index changed to ${value}`)
        hsm.send(new MainTabChanged(value), hsm.name)     
    }
    const {mainTabIndex} = model
    const isTab = tab => (mainTabIndex == tab)
    const classes = useStyles()
    return (
        <div className={classes.root}>
            <AppBar position="static" color="default">
                <Tabs value={mainTabIndex} onChange={onChange} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
                    <Tab label="Status" />
                    <Tab label="Console" />
                    <Tab label="Sensor" />
                    <Tab label="LedPanel" />
                </Tabs>
            </AppBar>
            <MainStatusTab hsm={hsm} show={isTab(MAIN_TAB.STATUS)}/>
            <MainConsoleTab hsm={hsm} show={isTab(MAIN_TAB.CONSOLE)}/>
            <MainSensorTab hsm={hsm} show={isTab(MAIN_TAB.SENSOR)}/>
            <MainLedPanelTab hsm={hsm} show={isTab(MAIN_TAB.LED_PANEL)}/>
        </div>
    )
}
