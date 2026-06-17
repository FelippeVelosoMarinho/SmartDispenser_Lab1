"""HTML templates for email notifications."""

def get_dispensation_success_template(patient_name: str, medication_name: str, time_str: str, period_label: str | None = None) -> str:
    """HTML template for successful medication intake."""
    period_row = ""
    if period_label:
        period_row = f"""
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Período:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{period_label}</td>
                        </tr>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Medicação Tomada com Sucesso</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0f766e; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">Confirmado: Medicação Tomada! 🟢</h1>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">Olá,</p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    Temos o prazer de informar que o paciente <strong>{patient_name}</strong> tomou com sucesso a medicação <strong>{medication_name}</strong>.
                </p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Paciente:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Medicamento:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{medication_name}</td>
                        </tr>
                        {period_row}
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Horário Ingestão:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{time_str}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Status:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #16a34a;"><strong>Ingerido com Sucesso</strong></td>
                        </tr>
                    </table>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
                    Este é um e-mail automático enviado pelo sistema <strong>Smart Dispenser</strong>.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

def get_dispensation_failure_template(patient_name: str, medication_name: str, scheduled_time: str, error_message: str, period_label: str | None = None) -> str:
    """HTML template for missed or failed medication intake."""
    detail_error = f"<p style='color: #dc2626;'><strong>Motivo/Erro:</strong> {error_message}</p>" if error_message else ""
    period_row = ""
    if period_label:
        period_row = f"""
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Período:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{period_label}</td>
                        </tr>
        """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Alerta: Dose Não Ingerida</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #be123c; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">⚠️ Alerta: Medicação Não Tomada</h1>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">Atenção Cuidador,</p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    O paciente <strong>{patient_name}</strong> não realizou a ingestão programada da medicação <strong>{medication_name}</strong>.
                </p>
                <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Paciente:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{patient_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Medicamento:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{medication_name}</td>
                        </tr>
                        {period_row}
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Horário Agendado:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{scheduled_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Status:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #be123c;"><strong>Dose Não Confirmada / Falha</strong></td>
                        </tr>
                    </table>
                    {detail_error}
                </div>
                <p style="font-size: 15px; font-weight: bold; color: #9f1239; margin-bottom: 24px;">
                    Recomendamos verificar o estado do paciente ou conferir se o dispenser possui pílulas suficientes.
                </p>
                <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
                    Este é um e-mail automático enviado pelo sistema <strong>Smart Dispenser</strong>.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

def get_critical_stock_template(patient_name: str, hardware_id: str) -> str:
    """HTML template for low/critical medication stock."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Alerta: Estoque Crítico de Medicamentos</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #d97706; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">📦 Estoque de Medicamentos Crítico!</h1>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">Atenção Cuidador,</p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    O Smart Dispenser (ID: <strong>{hardware_id}</strong>) vinculado ao paciente <strong>{patient_name}</strong> detectou que um ou mais compartimentos de pílulas atingiram o estoque crítico.
                </p>
                <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 14px; color: #b45309;">
                        Por favor, acesse o painel principal do aplicativo e realize o reabastecimento das gavetas indicadas para garantir a continuidade das dosagens programadas.
                    </p>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
                    Este é um e-mail automático enviado pelo sistema <strong>Smart Dispenser</strong>.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

def get_welcome_email_template(full_name: str, username: str) -> str:
    """HTML template for account registration/welcome email."""
    name_display = full_name if full_name else username
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Bem-vindo ao Smart Dispenser</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0f766e; padding: 32px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Bem-vindo ao Smart Dispenser! 🎉</h1>
                <p style="margin: 8px 0 0 0; font-size: 16px; color: #ccfbf1;">Sua plataforma inteligente de cuidado e saúde</p>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">Olá <strong>{name_display}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    Estamos muito felizes em ter você conosco! Sua conta foi criada com sucesso no sistema <strong>Smart Dispenser</strong>.
                </p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    A partir de agora, você poderá cadastrar seus pacientes, configurar dosagens personalizadas, monitorar o status do dispenser e receber notificações automáticas sobre o status de cada medicação.
                </p>
                
                <div style="background-color: #f0fdfa; border-left: 4px solid #0f766e; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #0f766e;">Detalhes do seu Acesso:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Usuário:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #1e293b;">{username}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; font-size: 14px; color: #475569;"><strong>Status da Conta:</strong></td>
                            <td style="padding: 4px 0; font-size: 14px; color: #0f766e;"><strong>Ativa e Pronta</strong></td>
                        </tr>
                    </table>
                </div>

                <div style="margin: 32px 0; text-align: center;">
                    <a href="http://localhost:5173" style="background-color: #0f766e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">
                        Acessar o Painel
                    </a>
                </div>

                <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
                    Este é um e-mail automático enviado pelo sistema <strong>Smart Dispenser</strong>.<br>
                    Se você não solicitou este cadastro, por favor desconsidere este e-mail.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def get_password_reset_email_template(full_name: str, reset_url: str) -> str:
    """HTML template for password reset email."""
    display_name = full_name or "Cuidador"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Redefinição de Senha</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #0f766e; padding: 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 22px; font-weight: bold;">Redefinição de Senha 🔐</h1>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">Olá, <strong>{display_name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                    Recebemos uma solicitação para redefinir a senha da sua conta no Smart Dispenser.
                    Clique no botão abaixo para criar uma nova senha.
                </p>
                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="{reset_url}" style="display: inline-block; background-color: #0f766e; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
                        Redefinir Senha
                    </a>
                </div>
                <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
                    Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha permanece a mesma.
                </p>
                <div style="background-color: #fef9c3; border-left: 4px solid #ca8a04; padding: 12px 16px; border-radius: 4px; margin-top: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #713f12;">
                        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>
                        <a href="{reset_url}" style="color: #0f766e; word-break: break-all;">{reset_url}</a>
                    </p>
                </div>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">Smart Dispenser • Sistema de Dispensação Inteligente</p>
            </div>
        </div>
    </body>
    </html>
    """
