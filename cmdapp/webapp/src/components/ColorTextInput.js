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
import TextField from '@mui/material/TextField'
import { ColorPicker } from "./ColorPicker.js";

const useStyles = makeStyles((theme) => ({
    container: {
        width: '500px'
    },
    colorContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        marginTop: '5px',
        marginBottom: '20px',
    },
}))

export function ColorTextInput({hsm, label, data, onChange}) {
    const {fgColor, bgColor, text} = data
    const {onFgColorChange, onBgColorChange, onTextChange} = onChange
    const classes = useStyles()

    const handleTextChange = (event)=>{
        onTextChange(event.target.value)
    }
    const handleFgColorChange = (color)=>{
        onFgColorChange(color.rgb)
    }
    const handleBgColorChange = (color)=>{
        onBgColorChange(color.rgb)
    }
    return (
        <div className={classes.container}>
            <TextField label={label} multiline maxRows={4} fullWidth
                value={text} onChange={handleTextChange} variant="outlined" />
            <div className={classes.colorContainer}>
                <ColorPicker hsm={hsm} label="Foreground Color" color={fgColor} onChange={handleFgColorChange} />
                <ColorPicker hsm={hsm} label="Background Color" color={bgColor} onChange={handleBgColorChange} />
            </div>
        </div>
    );
}