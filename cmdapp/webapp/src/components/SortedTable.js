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
import { Component } from 'react'
import { lighten } from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';

let {Evt, ErrorEvt} = require("../../../../galliumio/lib/index.js")

const useStyles = makeStyles((theme) => ({
    root: {
      width: '100%',
      marginTop: theme.spacing(3),
    },
    table: {
      minWidth: 800,//1020,
    },
    tableWrapper: {
      overflowX: 'auto',
    },
    tablecell: {
        fontSize: '14pt'
    },
    menu: {
        minWidth: 200
    }
}))

function TableMenu({hsm, label, items, keys}) {
    const [anchor, setAnchor] = useState(null)  
    const openMenu = (event)=>{
        setAnchor(event.currentTarget)
        event.stopPropagation()
    }
    const closeMenu = (event)=>{
        setAnchor(null)
        event.stopPropagation()
    }
    const selectItem = (event, item, keys)=>{
        item.func(keys)
        setAnchor(null)
        event.stopPropagation()
    }

    const classes = useStyles()
    return (
        <div>
            <Button onClick={openMenu} variant="contained" size="medium" color="primary">
                {label}
            </Button>
            <Menu className={classes.menu} anchorEl={anchor} open={anchor!=null} onClose={closeMenu}>
                {items.map((item,i)=>(
                    <MenuItem className={classes.menu} key={i} onClick={event=>{selectItem(event, item, keys)}}>
                        {item.label}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    )
}

export function SortedTable({hsm, data, col, rowActions, selActions}) {
    const [sortColIdx, setSortColIdx] = useState(0)     // Column index to sort with.
    const [sortOrder, setSortOrder] = useState('asc')   // 'asc', or 'desc'
    const [selKeys, setSelKeys] = useState([])          // An array of the primary keys of selected rows.

    const rowKeys = data.map(row=>row[col[0].prop])

    // Key is the value of the first column of the selected row.
    const selectRow = (key) => {
        // Clones the array in state, which is later set via setSelKeys.
        // React won't re-render if it keeps reference to the same array despite content is changed.
        let keys = [...selKeys]
        let idx = keys.indexOf(key)
        if (idx == -1) {
            keys.push(key)
        } else {
            keys.splice(idx, 1)
        }
        hsm.log(`selectRow ${key}: ${keys}`)
        setSelKeys(keys)
    }

    const selectAll = (event)=>{
        // Creates a new  array which is later set via setSelKeys.
        // React won't re-render if it keeps reference to the same array despite content is changed.
        let keys = []
        if (event.target.checked) {
            keys = [...rowKeys]
        }
        hsm.log(`selectAll: ${keys}`)
        setSelKeys(keys)
    }

    const sortCmp = (rowA, rowB)=>{
        let sortProp = col[sortColIdx].prop
        if (rowA[sortProp] < rowB[sortProp]) {
            return (sortOrder === 'asc')?(-1):1
        }
        if (rowA[sortProp] > rowB[sortProp]) {
            return (sortOrder === 'asc')?1:(-1)
        }
        return 0
    }

    const updateSorting = (idx)=>{
        let order = sortOrder
        let colIdx = sortColIdx
        if (idx === colIdx) {
            order = (order === 'asc')?'desc':'asc'
        } else {
            order = 'asc'
            colIdx = idx
        }
        setSortOrder(order)
        setSortColIdx(colIdx)
    }
    
    const classes = useStyles()
    return (
        <Paper className={classes.root}>
            <Table className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">
                            <Checkbox indeterminate={selKeys.length > 0 && selKeys.length < data.length}
                                checked={selKeys.length > 0 && selKeys.length === data.length} onChange={(event)=>selectAll(event)}/>
                        </TableCell>
                        {col.map((field, i)=>(
                            <TableCell className={classes.tablecell} key={i} align={field.numeric ? 'right':'left'}>
                                <Tooltip title="Sort" enterDelay={300} placement={field.numeric ? 'bottom-end' : 'bottom-start'}>
                                    <TableSortLabel
                                        active={sortColIdx === i} direction={sortOrder} onClick={(event)=>updateSorting(i)}>
                                        {field.label}
                                    </TableSortLabel>
                                </Tooltip>
                            </TableCell>
                        ))}
                        <TableCell>
                            <TableMenu hsm={hsm} label='Selected Action' items={selActions} keys={selKeys}/>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.sort(sortCmp).map((row, i)=>{
                        const rowKey = row[col[0].prop]
                        const isSelected = selKeys.includes(rowKey)
                        return (
                            <TableRow
                                hover onClick={(event)=>selectRow(rowKey)}
                                key={i} selected={isSelected}>
                                <TableCell padding="checkbox">
                                    <Checkbox checked={isSelected} />
                                </TableCell>
                                {col.map((field, j)=>(
                                    <TableCell className={classes.tablecell} key={j} align={field.numeric ? 'right':'left'}>
                                        {row[field.prop]}
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <TableMenu hsm={hsm} label='Row Action' items={rowActions} keys={[rowKey]}/>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Paper>
    )
}
