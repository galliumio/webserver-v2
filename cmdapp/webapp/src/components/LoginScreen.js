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

import React, {useRef} from 'react'
import { makeStyles } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'

let {Evt, ErrorEvt} = require("../../../../galliumstudio/lib/index.js")

const useStyles = makeStyles((theme) => ({
    button: {
      margin: theme.spacing(1),
    },
    container: {
        display: 'flex',
        flexWrap: 'wrap',
    },
    textField: {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        width: 300,
    },
}))

// Internal events
class LoginButtonClicked extends Evt {
    constructor(username, password) {
        super('LoginButtonClicked')
        this.username = username
        this.password = password
    }
}

export function LoginScreen({hsm, hsm:{ctx:{model}}}) {
    const usernameRef = useRef()
    const passwordRef = useRef()
    const onSubmit = (event)=>{
        event.preventDefault()
        hsm.log(`login clicked ${usernameRef.current.value} ${passwordRef.current.value}`)
        hsm.send(new LoginButtonClicked(usernameRef.current.value, passwordRef.current.value), hsm.name)
        usernameRef.current.focus()
        usernameRef.current.value = ''
        passwordRef.current.value = ''
    }

    //@todo Remove username and password. They are default values for development only. 
    const {username, password, disableUi} = model
    const classes = useStyles()
    return (
        <form className={classes.container} noValidate autoComplete="off" onSubmit={onSubmit}>
            <TextField id="username" label="Username" className={classes.textField} defaultValue={username} disabled={disableUi}
                inputRef={usernameRef} margin="normal" variant="outlined"/>
            <TextField id='password' label="Password" className={classes.textField} defaultValue={password} type='password' disabled={disableUi}
                inputRef={passwordRef} margin="normal" variant="outlined"/>
            <Button type="submit" variant="contained" color="primary" className={classes.button} disabled={disableUi}>
                Login
            </Button>
        </form>
    )
}

