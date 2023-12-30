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

let {Evt, ErrorEvt, fw, FW, Hsm} = require("../../galliumstudio/lib/index.js")
let { interpret } = require('xstate/lib/interpreter')

e1 = new Evt("HelloReq", "SysMgr", "Main", 12)
e1.print()

e2 = new ErrorEvt('ERRORIND')
e2.print()

FW.HSM_MAX++
console.log(FW.HSM_MAX)
fw.print()

class SysMgr extends Hsm {
    constructor(name) {
        let ctx = {
            var1: 1,
        }
        let config = {
            initial: 'a',
            on: { 
              EVENT: {
                actions: ()=> { 
                  console.log("root gets EVENT");
                }
              }
            },
            states: {
              a: {
                type: 'parallel',
                on: { 
                  EVENT: {
                    actions: ()=> { 
                      console.log("a gets EVENT");
                    }
                  }
                },
                states: {
                  region1: {
                    on: { 
                      EVENTA: {
                        actions: ({context: ctx, event: e}) => { 
                          console.log("region1 gets EVENT"); 
                          console.log(ctx.var1++, ctx.name);
                          console.log(e.type);
                          console.log(e.myVal)
                          let evt = new Evt('EVENTB')
                          ctx.sendReq(evt, ctx.name)
                          ctx.defer()
                        }
                      }
                    },
                  },
                  region2: {
                    on: { 
                      EVENTB: {
                        actions: ({context: ctx, event: e})=> { 
                          console.log(`region2 gets ${e.type}`); 
                        }
                      }
                    },
                  }
                },
              }, 
              b: {}, 
            }
        }
        super(name, ctx, config)
    }


}


//hsm = new Hsm('SysMgr', ctx, config)
//hsm.start()
//hsm2 = new Hsm('SysMgr2', ctx2, config)
//hsm2.start()

hsm = new SysMgr('SysMgr')
hsm.start()
hsm2 = new SysMgr('SysMgr2')
hsm2.start()

//hsm.emitter.emit('SysMgr', {type: 'EVENTA'})
fw.post(e1)
fw.post({type: 'EVENTA', to: 'SysMgr', myVal: 123})
fw.post({type: 'EVENTA', to: 'SysMgr', myVal: 456})
fw.post({type: 'EVENTA', to: 'SysMgr', myVal: 789})
fw.post({type: 'EVENTA', to: 'SysMgr2', myVal: 999})
fw.post({type: 'EVENTA', to: 'SysMgr', myVal: 234})
fw.post({type: 'EVENTA', to: 'SysMgr2', myVal: 888})


//console.log(`main context ${config.context.var1}`)