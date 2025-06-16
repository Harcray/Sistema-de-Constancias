document.addEventListener('DOMContentLoaded', () => {
    const btnVerificar = document.getElementById('btn-verificar');
    const codigoInput = document.getElementById('codigo-constancia');
    const resultadoDiv = document.getElementById('resultado-verificacion');
    
    btnVerificar.addEventListener('click', verificarConstancia);
    
    async function verificarConstancia() {
        const codigo = codigoInput.value.trim();
        
        if (!codigo) {
            resultadoDiv.innerHTML = '<p class="error">Por favor ingrese un código de constancia</p>';
            return;
        }
        
        try {
            const response = await fetch('/admin/verificar-constancia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ codigo })
            });
            
            const data = await response.json();
            
            if (data.valida) {
                resultadoDiv.innerHTML = `
                    <div class="constancia-valida">
                        <p>✅ Constancia válida</p>
                        <p><strong>Nombre:</strong> ${data.datos.usuario.nombre}</p>
                        <p><strong>Cédula:</strong> ${data.datos.usuario.cedula}</p>
                        <p><strong>Fecha de generación:</strong> ${data.datos.fechaGeneracion}</p>
                    </div>
                `;
            } else {
                resultadoDiv.innerHTML = '<p class="error">❌ Constancia no válida o no encontrada</p>';
            }
        } catch (error) {
            console.error('Error al verificar constancia:', error);
            resultadoDiv.innerHTML = '<p class="error">Error al verificar la constancia</p>';
        }
    }
});