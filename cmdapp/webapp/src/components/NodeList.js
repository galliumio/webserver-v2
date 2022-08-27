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

import React, {useState} from 'react'
import makeStyles from '@mui/styles/makeStyles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';

const useStyles = makeStyles((theme) => ({
    root: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.palette.background.paper,
    },
    item:{
        fontSize: '14pt',
    },
}));

export function NodeList({hsm, hsm:{ctx:{model}}, checked, onUpdate}) {
    let {mainStatusData} = model
    const labelId = (node)=>(`list-label-${node.nodeId}`)
    const nodeIdx = (node)=>(checked.indexOf(node.nodeId))
    const isChecked = (node)=>(nodeIdx(node) != -1)
    const onCheck = (node)=>()=>{
        // Clones the array to avoid changing properties.
        // (In case its parent passes as array in its "state" down as property.)
        const newChecked = [...checked]
        if (!isChecked(node)) {
            newChecked.push(node.nodeId)
        } else {
            newChecked.splice(nodeIdx(node), 1)
        }
        onUpdate(newChecked)
    }

    const classes = useStyles()
    return (
        <List className={classes.root}>
            {mainStatusData.map((node)=>(
                <ListItem key={node.nodeId} role={undefined} dense button onClick={onCheck(node)}>
                    <ListItemIcon>
                        <Checkbox edge="start" checked={isChecked(node)} tabIndex={-1}
                            disableRipple inputProps={{'aria-labelledby': labelId(node)}} />
                    </ListItemIcon>
                    <ListItemText classes={{primary: classes.item}} id={labelId(node)} primary={`${node.nodeId} (${node.connType})`} />
                </ListItem>)
            )}
        </List>
    )
}
