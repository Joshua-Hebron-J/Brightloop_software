import React,{createContext,useContext,useState,useEffect} from 'react';
import {User,UserRole} from '../types';
import {request,saveSession,clearSession} from '../services/api';
interface AuthContextType{user:User|null;role:UserRole;isAuthenticated:boolean;login:(e:string,p:string,r?:UserRole)=>Promise<boolean>;register:(n:string,e:string,p:string,r?:UserRole)=>Promise<boolean>;logout:()=>void;switchRole:(r:UserRole)=>void;isDemoAuth:boolean}
const AuthContext=createContext<AuthContextType|undefined>(undefined);
const view=(u:any):User=>({...u,name:u.firstName+' '+u.lastName,serverRole:u.role,role:u.role==='ADMIN'?'admin':u.role==='CUSTOMER'?'customer':'staff'});
export const AuthProvider:React.FC<{children:React.ReactNode}>=({children})=>{
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(!!sessionStorage.getItem('brightloop_token'));
 useEffect(()=>{if(sessionStorage.getItem('brightloop_token'))request('/auth/me').then(r=>setUser(view(r.user))).catch(()=>clearSession()).finally(()=>setLoading(false));const cb=()=>setUser(null);window.addEventListener('brightloop:logout',cb);return()=>window.removeEventListener('brightloop:logout',cb)},[]);
 const login=async(email:string,password:string)=>{const r=await request('/auth/login','POST',{email,password});saveSession(r);const me=await request('/auth/me');setUser(view(me.user));return true};
 const register=async(name:string,email:string,password:string)=>{const [firstName,...last]=name.trim().split(/\s+/);const r=await request('/auth/register','POST',{email,password,firstName,lastName:last.join(' ')||'Customer'});saveSession(r);const me=await request('/auth/me');setUser(view(me.user));return true};
 const logout=()=>{request('/auth/logout','POST',{}).finally(clearSession);setUser(null)};
 if(loading)return <div className="p-12 text-slate-600">Restoring your session…</div>;
 return <AuthContext.Provider value={{user,role:user?.role||'customer',isAuthenticated:!!user,login,register,logout,switchRole:()=>{},isDemoAuth:false}}>{children}</AuthContext.Provider>;
};
export const useAuth=()=>{const c=useContext(AuthContext);if(!c)throw new Error('AuthProvider missing');return c};
