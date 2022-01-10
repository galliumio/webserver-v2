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

import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Typography from '@material-ui/core/Typography'
import {SortedTable} from './SortedTable.js'
let {Evt, ErrorEvt} = require("../../../../galliumstudio/lib/index.js")

const useStyles = makeStyles((theme) => ({
}))

function TabContainer({children}) {
    return (
      <Typography component="div" style={{ padding: 0 }}>
        {children}
      </Typography>
    )
}

export function MainStatusTab({hsm, hsm:{ctx:{model}}, show}) {
    const onOpenConsole = (keys)=>{hsm.log(`OpenConsole for ${keys}`)}
    const onShowDetails = (keys)=>{hsm.log(`ShowDetails for ${keys}`)}
    const onDiscSel = (keys)=>{hsm.log(`Disconnect for ${keys}`)}
    const onPingSel = (keys)=>{hsm.log(`Ping for ${keys}`)}

    let {mainStatusData} = model
    const classes = useStyles()
    if (!show) {
        return (<div></div>)
    }
    return (
        <TabContainer>
            <h1>STATUS</h1>
            <SortedTable hsm={hsm} data={mainStatusData}
                // First column is (primary) key
                col={[
                    {prop: 'nodeId', label: 'Node ID', numeric: false},
                    {prop: 'connType', label: 'Type', numeric: false}, 
                    {prop: 'hsm', label: 'HSM', numeric: false}, 
                    {prop: 'username', label: 'Username', numeric: false}]}
                rowActions={[
                    {func: onOpenConsole, label: 'Open'},
                    {func: onShowDetails, label: 'Details'}]}
                selActions={[
                    {func: onDiscSel, label: 'Disconnect'},
                    {func: onPingSel, label: 'Ping'}]}>
            </SortedTable>
        </TabContainer>    
    )
}