# 🎨 LUMI UI - CATÁLOGO COMPLETO DE COMPONENTES

**Versión:** 4.0.0 | **Framework:** Svelte 5 (Runes) | **Total de Componentes:** 42

Este documento es el catálogo oficial y completo de todos los componentes disponibles en Lumi UI, el sistema de diseño profesional y futurista para Coedula.

---

## 📋 ÍNDICE POR CATEGORÍA

1. [Layout & Estructura](#1-layout--estructura) (8 componentes)
2. [Formularios & Input](#2-formularios--input) (11 componentes)
3. [Visualización de Datos](#3-visualización-de-datos) (12 componentes)
4. [Feedback & Overlays](#4-feedback--overlays) (7 componentes)
5. [Navegación](#5-navegación) (2 componentes)
6. [Dashboard](#6-dashboard) (2 componentes)

---

## 1. LAYOUT & ESTRUCTURA

### 1.1. Card

**Descripción:** Contenedor principal para contenido con diseño glassmorphism y radio de 24px.

**Props:**

- `title?: string` - Título del card
- `subtitle?: string` - Subtítulo opcional
- `clickable?: boolean` - Hace el card clickeable
- `hoverable?: boolean` - Añade efecto hover
- `image?: string` - URL de imagen de fondo
- `imageHeight?: string` - Altura de la imagen (default: '200px')
- `spaced?: boolean` - Añade padding interno
- `class?: string` - Clases CSS adicionales

**Snippets:**

- `header` - Contenido personalizado del header
- `footer` - Contenido del footer
- `children` - Contenido principal

**Ejemplo:**

```svelte
<Card title="Dashboard" subtitle="Overview" spaced>
	<p>Contenido del card</p>
	{#snippet footer()}
		<Button>Action</Button>
	{/snippet}
</Card>
```

---

### 1.2. Sidebar

**Descripción:** Barra lateral colapsable para navegación principal.

**Props:**

- `collapsed?: boolean` ($bindable) - Estado de colapso
- `mobileOpen?: boolean` ($bindable) - Estado en móvil
- `headerImage?: string` - Logo/imagen del header

**Snippets:**

- `header` - Contenido del header
- `children` - Items de navegación (usar `<SidebarItem>`)

**Componente relacionado: SidebarItem**

- `label: string` - Texto del item
- `icon?: string` - Icono Lucide
- `href?: string` - URL de navegación
- `active?: boolean` - Estado activo
- `badge?: string | number` - Badge de notificación

**Ejemplo:**

```svelte
<Sidebar bind:collapsed>
	<SidebarItem label="Dashboard" icon="home" href="/" active />
	<SidebarItem label="Users" icon="users" href="/users" badge={5} />
</Sidebar>
```

---

### 1.3. Navbar

**Descripción:** Barra superior para título de página y acciones.

**Snippets:**

- `title` - Título de la página
- `actions` - Botones de acción

**Ejemplo:**

```svelte
<Navbar>
	{#snippet title()}
		<h1>Dashboard</h1>
	{/snippet}
	{#snippet actions()}
		<Button icon="plus">New</Button>
	{/snippet}
</Navbar>
```

---

### 1.4. PageHeader

**Descripción:** Header estandarizado para páginas con breadcrumbs y acciones.

**Props:**

- `title: string` - Título principal
- `subtitle?: string` - Subtítulo descriptivo
- `icon?: string` - Icono Lucide
- `size?: 'sm' | 'md' | 'lg'` - Tamaño (default: 'lg')
- `bordered?: boolean` - Añade borde inferior

**Snippets:**

- `breadcrumbs` - Navegación breadcrumb
- `actions` - Botones de acción
- `children` - Contenido adicional

**Ejemplo:**

```svelte
<PageHeader title="Users" subtitle="Manage system users" icon="users">
	{#snippet actions()}
		<Button type="filled" icon="plus">New User</Button>
	{/snippet}
</PageHeader>
```

---

### 1.5. Title

**Descripción:** Componente de tipografía para títulos estandarizados.

**Props:**

- `title: string` - Texto del título
- `subtitle?: string` - Subtítulo
- `icon?: string` - Icono Lucide
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Tamaño (default: 'md')
- `color?: string` - Color del título

**Ejemplo:**

```svelte
<Title title="Dashboard" subtitle="Welcome back" icon="home" size="lg" />
```

---

### 1.6. Divider

**Descripción:** Separador horizontal con texto o icono opcional.

**Props:**

- `position?: 'left' | 'center' | 'right'` - Posición del texto (default: 'center')
- `icon?: string` - Icono Lucide
- `text?: string` - Texto del divider
- `spaced?: boolean` - Añade margen vertical

**Ejemplo:**

```svelte
<Divider text="Section 1" icon="star" position="left" spaced />
```

---

### 1.7. Collapse

**Descripción:** Sección expandible/colapsable (acordeón).

**Props:**

- `title: string` - Título del collapse
- `defaultOpen?: boolean` - Estado inicial abierto
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color del header
- `size?: 'sm' | 'md' | 'lg'` - Tamaño (default: 'md')
- `radius?: 'sm' | 'md' | 'lg' | 'xl'` - Radio de borde

**Snippets:**

- `titleSnippet` - Contenido personalizado del título
- `children` - Contenido colapsable

**Ejemplo:**

```svelte
<Collapse title="Advanced Settings" color="primary">
	<p>Contenido oculto por defecto</p>
</Collapse>
```

---

### 1.8. Fieldset

**Descripción:** Agrupador de contenido con leyenda.

**Props:**

- `legend: string` - Texto de la leyenda

**Snippets:**

- `children` - Contenido agrupado

**Ejemplo:**

```svelte
<Fieldset legend="Personal Information">
	<Input label="Name" />
	<Input label="Email" />
</Fieldset>
```

---

## 2. FORMULARIOS & INPUT

### 2.1. Button

**Descripción:** Botón interactivo con múltiples variantes y estados.

**Props:**

- `type?: 'filled' | 'flat' | 'border' | 'ghost'` - Variante visual (default: 'filled')
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` - Color (default: 'primary')
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` - Tamaño (default: 'md')
- `icon?: string` - Icono Lucide
- `iconAfter?: boolean` - Icono después del texto
- `radius?: boolean` - Bordes completamente redondeados
- `loading?: boolean` - Estado de carga
- `disabled?: boolean` - Deshabilitado
- `button?: 'button' | 'submit' | 'reset'` - Tipo HTML (default: 'button')

**Snippets:**

- `children` - Contenido del botón

**Ejemplo:**

```svelte
<Button type="filled" color="primary" icon="save" loading={isLoading}>Save Changes</Button>
<Button type="flat" icon="trash" color="danger" size="sm" />
```

---

### 2.2. Input

**Descripción:** Campo de texto con validación y estados visuales.

**Props:**

- `value: string` ($bindable) - Valor del input
- `type?: InputType` - Tipo HTML (text, email, password, etc.)
- `name?: string` - Nombre del campo
- `label?: string` - Etiqueta del campo
- `labelPlaceholder?: string` - Placeholder que se convierte en label
- `placeholder?: string` - Placeholder estándar
- `icon?: string` - Icono izquierdo
- `iconLabel?: string` - Aria-label del icono
- `actionIcon?: string` - Icono derecho clickeable
- `actionLabel?: string` - Aria-label del action icon
- `iconAfter?: boolean` - Posición del icono
- `iconNoBorder?: boolean` - Icono sin borde
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color (default: 'primary')
- `success?: boolean` - Estado de éxito
- `danger?: boolean` - Estado de error
- `warning?: boolean` - Estado de advertencia
- `successText?: string` - Mensaje de éxito
- `dangerText?: string` - Mensaje de error
- `warningText?: string` - Mensaje de advertencia
- `descriptionText?: string` - Texto descriptivo
- `size?: 'sm' | 'md' | 'lg'` - Tamaño (default: 'md')
- `disabled?: boolean` - Deshabilitado
- `readonly?: boolean` - Solo lectura
- `required?: boolean` - Campo requerido

**Eventos:**

- `oninput?: (e: Event) => void`
- `onfocus?: (e: FocusEvent) => void`
- `onblur?: (e: FocusEvent) => void`
- `onicon-click?: () => void`
- `onaction-click?: () => void`

**Ejemplo:**

```svelte
<Input
	bind:value={email}
	type="email"
	label="Email Address"
	icon="mail"
	placeholder="user@example.com"
	danger={!!errors.email}
	dangerText={errors.email}
	required
/>
```

---

### 2.3. Textarea

**Descripción:** Campo de texto multilínea con auto-resize.

**Props:**

- `value: string` ($bindable) - Valor del textarea
- `name?: string` - Nombre del campo
- `label?: string` - Etiqueta
- `placeholder?: string` - Placeholder
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `rows?: number` - Filas iniciales (default: 3)
- `maxRows?: number` - Máximo de filas para auto-resize
- `disabled?: boolean` - Deshabilitado
- `readonly?: boolean` - Solo lectura
- `required?: boolean` - Campo requerido
- `success?: boolean` - Estado de éxito
- `danger?: boolean` - Estado de error
- `successText?: string` - Mensaje de éxito
- `dangerText?: string` - Mensaje de error

**Ejemplo:**

```svelte
<Textarea
	bind:value={description}
	label="Description"
	placeholder="Enter description..."
	rows={4}
	maxRows={10}
/>
```

---

### 2.4. Select

**Descripción:** Dropdown personalizado con búsqueda y multi-selección (Floating UI).

**Props:**

- `value: any` ($bindable) - Valor seleccionado
- `options: any[]` - Array de opciones
- `placeholder?: string` - Placeholder (default: 'Select an option')
- `label?: string` - Etiqueta del campo
- `name?: string` - Nombre del campo
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `disabled?: boolean` - Deshabilitado
- `autocomplete?: boolean` - Habilita búsqueda
- `error?: boolean` - Estado de error
- `errorMessage?: string` - Mensaje de error
- `noDataText?: string` - Texto cuando no hay opciones
- `width?: string` - Ancho del select (default: '100%')
- `valueKey?: string` - Key para el valor (default: 'value')
- `labelKey?: string` - Key para el label (default: 'label')
- `disabledKey?: string` - Key para disabled (default: 'disabled')
- `clearable?: boolean` - Permite limpiar selección
- `loading?: boolean` - Estado de carga
- `placement?: Placement` - Posición del dropdown
- `maxHeight?: number` - Altura máxima del dropdown (default: 250)

**Eventos:**

- `onchange?: (value: any) => void`
- `onopen?: () => void`
- `onclose?: () => void`
- `onsearch?: (query: string) => void`

**Ejemplo:**

```svelte
<Select
	bind:value={selectedRole}
	options={[
		{ value: 'admin', label: 'Administrator' },
		{ value: 'user', label: 'User' },
		{ value: 'guest', label: 'Guest', disabled: true }
	]}
	label="Role"
	autocomplete
	clearable
/>
```

---

### 2.5. Switch

**Descripción:** Toggle switch para valores booleanos.

**Props:**

- `checked: boolean` ($bindable) - Estado del switch
- `label?: string` - Etiqueta
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Tamaño (default: 'md')
- `disabled?: boolean` - Deshabilitado

**Snippets:**

- `children` - Contenido personalizado de la etiqueta

**Ejemplo:**

```svelte
<Switch bind:checked={isActive} label="Active" color="success" />
<Switch bind:checked={notifications} size="sm">Enable notifications</Switch>
```

---

### 2.6. Checkbox

**Descripción:** Casilla de verificación con estado indeterminado.

**Props:**

- `checked: boolean` ($bindable) - Estado del checkbox
- `indeterminate?: boolean` ($bindable) - Estado indeterminado
- `label?: string` - Etiqueta
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `disabled?: boolean` - Deshabilitado

**Snippets:**

- `children` - Contenido personalizado

**Ejemplo:**

```svelte
<Checkbox bind:checked={acceptTerms} label="Accept terms" required />
<Checkbox bind:checked={selectAll} bind:indeterminate color="primary" />
```

---

### 2.7. Radio

**Descripción:** Botón de radio para selección única en grupo.

**Props:**

- `group: any` ($bindable) - Valor del grupo
- `value: any` - Valor de este radio
- `label?: string` - Etiqueta
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `disabled?: boolean` - Deshabilitado

**Snippets:**

- `children` - Contenido personalizado

**Ejemplo:**

```svelte
<Radio bind:group={selectedPlan} value="basic" label="Basic Plan" />
<Radio bind:group={selectedPlan} value="pro" label="Pro Plan" />
<Radio bind:group={selectedPlan} value="enterprise" label="Enterprise" />
```

---

### 2.8. FileUpload

**Descripción:** Zona de drag & drop para subida de archivos con progreso.

**Props:**

- `files: FileUploadFile[]` ($bindable) - Array de archivos
- `accept?: string` - Tipos de archivo aceptados (e.g., 'image/\*')
- `multiple?: boolean` - Permite múltiples archivos
- `maxSize?: number` - Tamaño máximo en bytes
- `disabled?: boolean` - Deshabilitado

**Tipo FileUploadFile:**

```typescript
interface FileUploadFile {
	file: File;
	status: 'pending' | 'uploading' | 'success' | 'error';
	progress?: number;
	error?: string;
}
```

**Ejemplo:**

```svelte
<FileUpload bind:files={uploadedFiles} accept="image/*" multiple maxSize={5242880} />
```

---

### 2.9. AvatarPicker

**Descripción:** Selector visual de avatares predefinidos.

**Props:**

- `options: AvatarOption[]` - Array de opciones de avatar
- `value: string` ($bindable) - Avatar seleccionado
- `name?: string` - Nombre del campo

**Tipo AvatarOption:**

```typescript
interface AvatarOption {
	value: string;
	label: string;
	color?: AvatarColor;
}
```

**Ejemplo:**

```svelte
<AvatarPicker
	bind:value={selectedAvatar}
	options={[
		{ value: 'avatar1', label: 'Avatar 1', color: 'primary' },
		{ value: 'avatar2', label: 'Avatar 2', color: 'secondary' }
	]}
/>
```

---

### 2.10. SegmentedControl

**Descripción:** Control de segmentos con efecto glider (toggle horizontal).

**Props:**

- `value: string | number` ($bindable) - Valor seleccionado
- `options: SegmentedControlOption[]` - Array de opciones
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `disabled?: boolean` - Deshabilitado

**Tipo SegmentedControlOption:**

```typescript
interface SegmentedControlOption {
	label: string;
	value: string | number;
	icon?: string;
	disabled?: boolean;
}
```

**Ejemplo:**

```svelte
<SegmentedControl
	bind:value={viewMode}
	options={[
		{ label: 'Grid', value: 'grid', icon: 'grid' },
		{ label: 'List', value: 'list', icon: 'list' }
	]}
	color="primary"
/>
```

---

### 2.11. Slider

**Descripción:** Control deslizante para valores numéricos.

**Props:**

- `value: number` ($bindable) - Valor actual
- `min?: number` - Valor mínimo (default: 0)
- `max?: number` - Valor máximo (default: 100)
- `step?: number` - Incremento (default: 1)
- `label?: string` - Etiqueta
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `disabled?: boolean` - Deshabilitado
- `showValue?: boolean` - Muestra el valor actual

**Ejemplo:**

```svelte
<Slider bind:value={volume} min={0} max={100} step={5} label="Volume" showValue color="primary" />
```

---

## 3. VISUALIZACIÓN DE DATOS

### 3.1. Table

**Descripción:** Tabla de datos con búsqueda, paginación, ordenamiento y selección.

**Props:**

- `data?: TableRow[]` - Array de datos
- `compact?: boolean` - Modo compacto
- `stripe?: boolean` - Filas alternadas
- `hover?: boolean` - Efecto hover
- `search?: boolean` - Habilita búsqueda
- `selectable?: boolean` - Permite selección de filas
- `pagination?: boolean` - Habilita paginación
- `noDataText?: string` - Texto cuando no hay datos
- `itemsPerPage?: number` - Items por página (default: 10)
- `loading?: boolean` - Estado de carga
- `sortable?: boolean` - Habilita ordenamiento
- `selected?: any[]` ($bindable) - Filas seleccionadas

**Snippets:**

- `header` - Header personalizado
- `thead` - Encabezados de columnas
- `row` - Renderizado de fila ({row, index})
- `paginationSlot` - Paginación personalizada

**Eventos:**

- `onrow-click?: (row: TableRow) => void`
- `onrow-select?: (selected: TableRow[]) => void`
- `onsearch?: (query: string) => void`
- `onpage-change?: (page: number) => void`
- `onsort?: (column: string, direction: 'asc' | 'desc') => void`

**Ejemplo:**

```svelte
<Table data={users} search pagination selectable>
	{#snippet thead()}
		<th>Name</th>
		<th>Email</th>
		<th>Role</th>
		<th>Actions</th>
	{/snippet}

	{#snippet row({ row, index })}
		<td>{row.name}</td>
		<td>{row.email}</td>
		<td><Chip color="primary">{row.role}</Chip></td>
		<td>
			<Button type="flat" icon="edit" size="sm" />
			<Button type="flat" icon="trash" size="sm" color="danger" />
		</td>
	{/snippet}
</Table>
```

---

### 3.2. StatCard

**Descripción:** Tarjeta de estadística para dashboards.

**Props:**

- `title: string` - Título de la estadística
- `value: string | number` - Valor principal
- `icon?: string` - Icono Lucide
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` - Color
- `subtitle?: string` - Subtítulo o descripción
- `href?: string` - URL de navegación

**Ejemplo:**

```svelte
<StatCard
	title="Total Users"
	value={1234}
	icon="users"
	color="primary"
	subtitle="+12% from last month"
	href="/users"
/>
```

---

### 3.3. QuickAccessCard

**Descripción:** Tarjeta de acceso rápido para dashboards.

**Props:**

- `title: string` - Título de la acción
- `description?: string` - Descripción
- `icon?: string` - Icono Lucide
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` - Color
- `href?: string` - URL de navegación

**Ejemplo:**

```svelte
<QuickAccessCard
	title="Create User"
	description="Add a new user to the system"
	icon="userPlus"
	color="primary"
	href="/users/new"
/>
```

---

### 3.4. InfoItem

**Descripción:** Par clave-valor para mostrar información.

**Props:**

- `label: string` - Etiqueta
- `value?: string` - Valor
- `icon?: string` - Icono Lucide
- `layout?: 'horizontal' | 'vertical'` - Disposición (default: 'horizontal')
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color

**Snippets:**

- `iconSlot` - Icono personalizado
- `labelSlot` - Label personalizado
- `children` - Valor personalizado

**Ejemplo:**

```svelte
<InfoItem label="Email" value="user@example.com" icon="mail" />
<InfoItem label="Status" icon="activity" layout="vertical">
	<Chip color="success">Active</Chip>
</InfoItem>
```

---

### 3.5. Chip

**Descripción:** Etiqueta pequeña para estados o categorías.

**Props:**

- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` - Color
- `variant?: 'filled' | 'outlined' | 'flat'` - Variante visual
- `closable?: boolean` - Muestra botón de cerrar
- `size?: 'sm' | 'md' | 'lg'` - Tamaño

**Snippets:**

- `children` - Contenido del chip

**Eventos:**

- `onclose?: () => void`

**Ejemplo:**

```svelte
<Chip color="success">Active</Chip>
<Chip color="danger" variant="outlined">Inactive</Chip>
<Chip color="primary" closable onclose={() => removeTag()}>Tag</Chip>
```

---

### 3.6. StatusIndicator

**Descripción:** Indicador de estado con punto de color.

**Props:**

- `active?: boolean` - Estado activo (verde) o inactivo (gris)
- `status?: string` - Texto del estado
- `pulse?: boolean` - Animación de pulso

**Ejemplo:**

```svelte
<StatusIndicator active pulse status="Online" />
<StatusIndicator active={false} status="Offline" />
```

---

### 3.7. Image

**Descripción:** Imagen mejorada con skeleton loading y zoom.

**Props:**

- `src: string` - URL de la imagen
- `alt: string` - Texto alternativo
- `width?: string | number` - Ancho
- `height?: string | number` - Alto
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'` - Radio de borde
- `isZoomed?: boolean` - Habilita zoom al hover

**Ejemplo:**

```svelte
<Image src="/images/product.jpg" alt="Product" width={300} height={200} radius="md" isZoomed />
```

---

### 3.8. Icon

**Descripción:** Wrapper para iconos Lucide con configuración centralizada.

**Props:**

- `icon: string` - Nombre del icono Lucide
- `size?: number | string` - Tamaño en px (default: 24)
- `color?: string` - Color CSS
- `stroke?: number` - Grosor del trazo (default: 2)

**Ejemplo:**

```svelte
<Icon icon="user" size={24} color="var(--lumi-color-primary)" />
<Icon icon="settings" size={32} stroke={1.5} />
```

---

### 3.9. IconBadge

**Descripción:** Icono con fondo de color en forma de badge.

**Props:**

- `icon: string` - Nombre del icono Lucide
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño

**Ejemplo:**

```svelte
<IconBadge icon="user" color="primary" size="md" />
<IconBadge icon="bell" color="warning" size="lg" />
```

---

### 3.10. UserInfo

**Descripción:** Componente de perfil de usuario con avatar y datos.

**Props:**

- `name: string` - Nombre del usuario
- `email?: string` - Email del usuario
- `avatar?: string` - URL del avatar
- `size?: 'sm' | 'md' | 'lg'` - Tamaño (default: 'md')
- `layout?: 'horizontal' | 'vertical'` - Disposición

**Ejemplo:**

```svelte
<UserInfo
	name="John Doe"
	email="john@example.com"
	avatar="/avatars/john.jpg"
	size="md"
	layout="horizontal"
/>
```

---

### 3.11. Avatar

**Descripción:** Avatar circular con iniciales o imagen.

**Props:**

- `src?: string` - URL de la imagen
- `alt?: string` - Texto alternativo
- `name?: string` - Nombre para generar iniciales
- `color?: AvatarColor` - Color de fondo ('primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info')
- `size?: AvatarSize` - Tamaño ('xs' | 'sm' | 'md' | 'lg' | 'xl')

**Ejemplo:**

```svelte
<Avatar src="/avatar.jpg" alt="User" size="md" />
<Avatar name="John Doe" color="primary" size="lg" />
```

---

### 3.12. List

**Descripción:** Lista estructurada con headers e items.

**Props (List):**

- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño

**Componentes relacionados:**

- `ListHeader` - Header de sección
  - `title: string` - Título del header
- `ListItem` - Item de lista
  - `title: string` - Título del item
  - `subtitle?: string` - Subtítulo
  - `icon?: string` - Icono Lucide
  - `active?: boolean` - Estado activo
  - `href?: string` - URL de navegación

**Ejemplo:**

```svelte
<List>
	<ListHeader title="Recent Activity" />
	<ListItem title="User created" subtitle="2 minutes ago" icon="userPlus" />
	<ListItem title="Settings updated" subtitle="1 hour ago" icon="settings" />
</List>
```

---

## 4. FEEDBACK & OVERLAYS

### 4.1. Dialog

**Descripción:** Modal window con focus trap y gestión de accesibilidad.

**Props:**

- `open: boolean` ($bindable) - Estado de apertura
- `title?: string` - Título del modal
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Tamaño (default: 'md')
- `persistent?: boolean` - No se cierra al hacer clic fuera
- `scrollable?: boolean` - Contenido scrolleable
- `fullScreen?: boolean` - Modo pantalla completa
- `hideClose?: boolean` - Oculta botón de cerrar
- `closeLabel?: string` - Aria-label del botón cerrar
- `closeOnEscape?: boolean` - Cierra con tecla Escape (default: true)

**Snippets:**

- `header` - Header personalizado
- `children` - Contenido principal
- `footer` - Footer con acciones

**Eventos:**

- `onclose?: () => void`
- `onopen?: () => void`
- `onafteropen?: () => void`
- `onafterclose?: () => void`

**Ejemplo:**

```svelte
<Dialog bind:open={showModal} title="Confirm Action" size="md">
	<p>Are you sure you want to proceed?</p>
	{#snippet footer()}
		<Button type="flat" onclick={() => (showModal = false)}>Cancel</Button>
		<Button type="filled" color="danger" onclick={confirmAction}>Confirm</Button>
	{/snippet}
</Dialog>
```

---

### 4.2. Alert

**Descripción:** Notificación inline con tipos visuales.

**Props:**

- `type?: 'info' | 'success' | 'warning' | 'danger'` - Tipo de alerta (default: 'info')
- `title?: string` - Título de la alerta
- `closable?: boolean` - Muestra botón de cerrar
- `active?: boolean` ($bindable) - Estado de visibilidad

**Snippets:**

- `children` - Contenido de la alerta

**Ejemplo:**

```svelte
<Alert type="success" title="Success!" closable>Your changes have been saved successfully.</Alert>
<Alert type="danger" title="Error">An error occurred while processing your request.</Alert>
```

---

### 4.3. Notification

**Descripción:** Toast message (se usa con el store de notificaciones).

**Props:**

- `type?: 'info' | 'success' | 'warning' | 'error'` - Tipo de notificación
- `title?: string` - Título
- `message: string` - Mensaje principal
- `duration?: number` - Duración en ms (default: 3000)
- `position?: NotificationPosition` - Posición en pantalla

**Uso con Store:**

```svelte
<script>
	import { showToast } from '$lib/stores/Toast';

	function handleSuccess() {
		showToast('Operation completed successfully', 'success');
	}

	function handleError() {
		showToast('An error occurred', 'error');
	}
</script>
```

---

### 4.4. EmptyState

**Descripción:** Placeholder para estados vacíos.

**Props:**

- `title: string` - Título del estado vacío
- `description?: string` - Descripción
- `icon?: string` - Icono Lucide
- `image?: string` - URL de imagen personalizada
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color

**Snippets:**

- `actions` - Botones de acción
- `visual` - Contenido visual personalizado

**Ejemplo:**

```svelte
<EmptyState
	title="No users found"
	description="Get started by creating your first user"
	icon="users"
	color="primary"
>
	{#snippet actions()}
		<Button type="filled" icon="plus">Create User</Button>
	{/snippet}
</EmptyState>
```

---

### 4.5. Loading

**Descripción:** Indicador de carga (spinner).

**Props:**

- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: number` - Tamaño en px (default: 40)

**Ejemplo:**

```svelte
<Loading color="primary" size={48} />
```

---

### 4.6. Progress

**Descripción:** Barra de progreso.

**Props:**

- `value: number` - Valor actual (0-100)
- `max?: number` - Valor máximo (default: 100)
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `showValue?: boolean` - Muestra porcentaje

**Ejemplo:**

```svelte
<Progress value={75} color="success" showValue />
<Progress value={uploadProgress} color="primary" size="lg" />
```

---

### 4.7. Tooltip

**Descripción:** Información contextual al hover.

**Props:**

- `text?: string` - Texto del tooltip
- `position?: 'top' | 'bottom' | 'left' | 'right'` - Posición (default: 'top')
- `color?: 'dark' | 'light'` - Color del tooltip

**Snippets:**

- `children` - Elemento que activa el tooltip
- `content` - Contenido personalizado del tooltip

**Ejemplo:**

```svelte
<Tooltip text="Click to edit" position="top">
	<Button icon="edit" type="flat" />
</Tooltip>

<Tooltip position="right">
	<Icon icon="info" />
	{#snippet content()}
		<strong>Important:</strong> This action cannot be undone.
	{/snippet}
</Tooltip>
```

---

## 5. NAVEGACIÓN

### 5.1. Tabs

**Descripción:** Interfaz de pestañas para contenido tabular.

**Props:**

- `value: string | number` ($bindable) - Tab activo
- `tabs: Tab[]` - Array de pestañas
- `position?: 'top' | 'bottom' | 'left' | 'right'` - Posición (default: 'top')
- `color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'` - Color

**Tipo Tab:**

```typescript
interface Tab {
	label: string;
	value: string | number;
	icon?: string;
	disabled?: boolean;
}
```

**Snippets:**

- `children` - Contenido de las tabs

**Ejemplo:**

```svelte
<Tabs
	bind:value={activeTab}
	tabs={[
		{ label: 'Profile', value: 'profile', icon: 'user' },
		{ label: 'Settings', value: 'settings', icon: 'settings' },
		{ label: 'Security', value: 'security', icon: 'lock' }
	]}
	color="primary"
>
	{#if activeTab === 'profile'}
		<ProfileContent />
	{:else if activeTab === 'settings'}
		<SettingsContent />
	{:else}
		<SecurityContent />
	{/if}
</Tabs>
```

---

### 5.2. Dropdown

**Descripción:** Menú desplegable con Floating UI.

**Props:**

- `open?: boolean` ($bindable) - Estado de apertura
- `trigger?: 'click' | 'hover'` - Tipo de activación (default: 'click')
- `position?: Placement` - Posición del dropdown
- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `closeOnClick?: boolean` - Cierra al hacer clic en item

**Snippets:**

- `triggerContent` - Contenido del trigger
- `children` - Items del dropdown (usar `<DropdownItem>`)

**Componente relacionado: DropdownItem**

- `label: string` - Texto del item
- `icon?: string` - Icono Lucide
- `href?: string` - URL de navegación
- `disabled?: boolean` - Deshabilitado
- `danger?: boolean` - Estilo de peligro

**Ejemplo:**

```svelte
<Dropdown>
	{#snippet triggerContent()}
		<Button icon="moreVertical" type="flat" />
	{/snippet}

	<DropdownItem label="Edit" icon="edit" onclick={handleEdit} />
	<DropdownItem label="Duplicate" icon="copy" onclick={handleDuplicate} />
	<DropdownItem label="Delete" icon="trash" danger onclick={handleDelete} />
</Dropdown>
```

---

## 6. DASHBOARD

### 6.1. StatCard

Ya documentado en sección 3.2 (Visualización de Datos).

---

### 6.2. QuickAccessCard

Ya documentado en sección 3.3 (Visualización de Datos).

---

## 7. COMPONENTES ESPECIALES

### 7.1. Context

**Descripción:** Menú contextual (right-click).

**Props:**

- `size?: 'sm' | 'md' | 'lg'` - Tamaño
- `closeOnClick?: boolean` - Cierra al hacer clic

**Snippets:**

- `children` - Items del menú (usar `<ContextItem>`)

**Componente relacionado: ContextItem**

- `label: string` - Texto del item
- `icon?: string` - Icono Lucide
- `disabled?: boolean` - Deshabilitado
- `danger?: boolean` - Estilo de peligro

**Ejemplo:**

```svelte
<Context>
	<ContextItem label="Copy" icon="copy" onclick={handleCopy} />
	<ContextItem label="Paste" icon="clipboard" onclick={handlePaste} />
	<ContextItem label="Delete" icon="trash" danger onclick={handleDelete} />
</Context>
```

---

### 7.2. PermissionsModal

**Descripción:** Modal especializado para gestión de permisos de usuario.

**Props:**

- Componente específico del proyecto Coedula
- Gestiona permisos granulares por módulo

**Uso:**

```svelte
<script>
	import { PermissionsModal } from '$lib/components';
</script>

<PermissionsModal bind:open={showPermissions} userId={selectedUser.id} />
```

---

## 8. GUÍA DE IMPORTACIÓN

Todos los componentes se importan desde el barrel export:

```svelte
<script lang="ts">
	import { Button, Input, Card, Table, Dialog, Select, Chip, Icon } from '$lib/components';
</script>
```

---

## 9. SISTEMA DE COLORES

Todos los componentes que aceptan la prop `color` soportan estos valores:

- `primary` - Azul profesional (#1e40af)
- `secondary` - Coral (#fb7185)
- `success` - Verde (#22c55e)
- `warning` - Ámbar (#f59e0b)
- `danger` - Rojo (#ef4444)
- `info` - Azul cielo (#3b82f6)

---

## 10. SISTEMA DE TAMAÑOS

La mayoría de componentes soportan estos tamaños:

- `xs` - Extra pequeño
- `sm` - Pequeño
- `md` - Mediano (default)
- `lg` - Grande
- `xl` - Extra grande

---

## 11. PATRONES DE USO COMUNES

### Formulario Completo

```svelte
<Card title="User Form" spaced>
	<form method="POST" use:enhance>
		<Input bind:value={name} label="Name" icon="user" required />

		<Input bind:value={email} type="email" label="Email" icon="mail" required />

		<Select bind:value={role} options={roleOptions} label="Role" autocomplete />

		<Switch bind:checked={isActive} label="Active" color="success" />

		<div class="lumi-flex lumi-justify--end lumi-flex--gap-sm">
			<Button type="flat" onclick={handleCancel}>Cancel</Button>
			<Button type="filled" button="submit" icon="save">Save</Button>
		</div>
	</form>
</Card>
```

### Dashboard con Estadísticas

```svelte
<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-lg">
	<StatCard
		title="Total Users"
		value={stats.users}
		icon="users"
		color="primary"
		subtitle="+12% from last month"
	/>

	<StatCard
		title="Revenue"
		value={`$${stats.revenue}`}
		icon="dollarSign"
		color="success"
		subtitle="+8% from last month"
	/>

	<StatCard
		title="Orders"
		value={stats.orders}
		icon="shoppingCart"
		color="info"
		subtitle="+23% from last month"
	/>

	<StatCard
		title="Pending"
		value={stats.pending}
		icon="clock"
		color="warning"
		subtitle="Requires attention"
	/>
</div>
```

### Tabla con Acciones

```svelte
<Card spaced>
	<div class="lumi-flex lumi-justify--between lumi-align-items--center">
		<Title title="Users" icon="users" />
		<Button type="filled" icon="plus" onclick={() => (showModal = true)}>New User</Button>
	</div>

	<Table data={users} search pagination selectable stripe hover>
		{#snippet thead()}
			<th>Name</th>
			<th>Email</th>
			<th>Role</th>
			<th>Status</th>
			<th>Actions</th>
		{/snippet}

		{#snippet row({ row })}
			<td>
				<UserInfo name={row.name} avatar={row.avatar} size="sm" />
			</td>
			<td>{row.email}</td>
			<td><Chip color="primary">{row.role}</Chip></td>
			<td>
				<StatusIndicator
					active={row.active}
					status={row.active ? 'Active' : 'Inactive'}
					pulse={row.active}
				/>
			</td>
			<td>
				<div class="lumi-flex lumi-flex--gap-xs">
					<Tooltip text="Edit user">
						<Button type="flat" icon="edit" size="sm" onclick={() => editUser(row)} />
					</Tooltip>
					<Tooltip text="Delete user">
						<Button
							type="flat"
							icon="trash"
							size="sm"
							color="danger"
							onclick={() => deleteUser(row)}
						/>
					</Tooltip>
				</div>
			</td>
		{/snippet}
	</Table>
</Card>
```

### Modal de Confirmación

```svelte
<Dialog bind:open={showDeleteModal} title="Confirm Deletion" size="sm">
	<Alert type="warning" title="Warning">
		This action cannot be undone. Are you sure you want to delete this user?
	</Alert>

	<InfoItem label="User" value={selectedUser?.name} icon="user" />
	<InfoItem label="Email" value={selectedUser?.email} icon="mail" />

	{#snippet footer()}
		<Button type="flat" onclick={() => (showDeleteModal = false)}>Cancel</Button>
		<Button type="filled" color="danger" icon="trash" loading={isDeleting} onclick={confirmDelete}>
			Delete
		</Button>
	{/snippet}
</Dialog>
```

---

## 12. MEJORES PRÁCTICAS

### ✅ DO (Hacer)

1. **Usar tokens CSS:**

   ```svelte
   <style>
   	.custom {
   		padding: var(--lumi-space-md);
   		color: var(--lumi-color-primary);
   	}
   </style>
   ```

2. **Usar clases utilitarias:**

   ```svelte
   <div class="lumi-flex lumi-justify--between lumi-align-items--center">
   ```

3. **Bindear valores reactivos:**

   ```svelte
   <Input bind:value={email} />
   <Switch bind:checked={isActive} />
   ```

4. **Usar snippets para personalización:**

   ```svelte
   <Card>
   	{#snippet footer()}
   		<Button>Action</Button>
   	{/snippet}
   </Card>
   ```

5. **Verificar permisos antes de mostrar acciones:**
   ```svelte
   {#if can('users:create')}
   	<Button icon="plus">New User</Button>
   {/if}
   ```

### ❌ DON'T (No hacer)

1. **No usar estilos inline:**

   ```svelte
   <!-- ❌ MAL -->
   <div style="padding: 16px; color: #1e40af;">

   <!-- ✅ BIEN -->
   <div class="custom-class">
   ```

2. **No hardcodear colores:**

   ```svelte
   <!-- ❌ MAL -->
   background: #1e40af;

   <!-- ✅ BIEN -->
   background: var(--lumi-color-primary);
   ```

3. **No usar librerías externas de UI:**

   ```svelte
   <!-- ❌ MAL -->
   import {Button} from 'some-ui-library';

   <!-- ✅ BIEN -->
   import {Button} from '$lib/components';
   ```

4. **No usar Svelte 4 syntax:**

   ```svelte
   <!-- ❌ MAL (Svelte 4) -->
   export let value; $: computed = value * 2;

   <!-- ✅ BIEN (Svelte 5 Runes) -->
   let {value} = $props(); const computed = $derived(value * 2);
   ```

5. **No crear componentes duplicados:**

   ```svelte
   <!-- ❌ MAL -->
   <div class="custom-button">Click me</div>

   <!-- ✅ BIEN -->
   <Button>Click me</Button>
   ```

---

## 13. ACCESIBILIDAD

Todos los componentes de Lumi UI están diseñados con accesibilidad en mente:

- ✅ **Navegación por teclado** completa
- ✅ **ARIA labels** y roles apropiados
- ✅ **Focus trap** en modales
- ✅ **Contraste de colores** WCAG AA
- ✅ **Screen reader** friendly
- ✅ **Semantic HTML** correcto

### Ejemplo de uso accesible:

```svelte
<Button
	icon="trash"
	aria-label="Delete user John Doe"
	onclick={handleDelete}
/>

<Input
	label="Email"
	aria-label="User email address"
	required
/>

<Dialog
	title="Confirm Action"
	closeLabel="Close confirmation dialog"
>
```

---

## 14. PERFORMANCE

### Optimizaciones incluidas:

1. **Lazy loading** de iconos (tree-shaking)
2. **Virtual scrolling** en tablas grandes (paginación)
3. **Debounce** en búsquedas
4. **Memoización** con `$derived`
5. **Portal rendering** para overlays (Dialog, Dropdown)
6. **CSS containment** para mejor rendering

---

## 15. RESUMEN DE COMPONENTES

| Categoría                  | Componentes                                                                                                       | Total  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| **Layout & Estructura**    | Card, Sidebar, Navbar, PageHeader, Title, Divider, Collapse, Fieldset                                             | 8      |
| **Formularios & Input**    | Button, Input, Textarea, Select, Switch, Checkbox, Radio, FileUpload, AvatarPicker, SegmentedControl, Slider      | 11     |
| **Visualización de Datos** | Table, StatCard, QuickAccessCard, InfoItem, Chip, StatusIndicator, Image, Icon, IconBadge, UserInfo, Avatar, List | 12     |
| **Feedback & Overlays**    | Dialog, Alert, Notification, EmptyState, Loading, Progress, Tooltip                                               | 7      |
| **Navegación**             | Tabs, Dropdown                                                                                                    | 2      |
| **Dashboard**              | StatCard, QuickAccessCard                                                                                         | 2      |
| **Especiales**             | Context, PermissionsModal                                                                                         | 2      |
| **TOTAL**                  |                                                                                                                   | **42** |

---

## 16. RECURSOS ADICIONALES

- **Documentación técnica:** `docs/AGENTS.md`
- **Blueprint de módulos:** `docs/ENTITY_MODULE_BLUEPRINT.md`
- **Tokens CSS:** `src/lib/styles/tokens.css`
- **Utilidades CSS:** `src/lib/styles/lumi-core.css`
- **Iconos disponibles:** [Lucide Icons](https://lucide.dev/icons/)

---

**Última actualización:** Febrero 2026
**Mantenido por:** Equipo Coedula
**Licencia:** Propietario
