package com.visionkrono.detection.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.visionkrono.detection.data.model.EventListItem

@Composable
fun EventsListScreen(
    events: List<EventListItem>,
    isLoading: Boolean,
    onEventSelected: (String, String) -> Unit,
    onRefresh: () -> Unit
) {
    if (isLoading && events.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator()
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "🏃 Eventos Disponíveis",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        if (events.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "📭",
                        fontSize = 64.sp
                    )
                    Text(
                        text = "Nenhum evento disponível",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = onRefresh) {
                        Text("🔄 Atualizar")
                    }
                }
            }
            return
        }

        // Lista de eventos
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(events) { event ->
                EventCard(
                    event = event,
                    onClick = {
                        onEventSelected(event.id, event.name)
                    }
                )
            }
        }
    }
}

@Composable
fun EventCard(
    event: EventListItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = event.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    if (event.startDate != null) {
                        Text(
                            text = "📅 ${formatDate(event.startDate)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Indicador de dispositivos
                Column(
                    horizontalAlignment = Alignment.End
                ) {
                    Text(
                        text = "📱",
                        fontSize = 24.sp
                    )
                    Text(
                        text = "${event.deviceCount ?: 0} dispositivo(s)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Status
            if (event.status != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    color = when (event.status.lowercase()) {
                        "active", "ativo" -> MaterialTheme.colorScheme.primaryContainer
                        "pending", "pendente" -> MaterialTheme.colorScheme.secondaryContainer
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    },
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = event.status,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }
    }
}

private fun formatDate(dateString: String?): String {
    if (dateString == null) return ""
    // Formatação simples - você pode usar SimpleDateFormat ou DateTimeFormatter
    return try {
        dateString.substring(0, 10) // YYYY-MM-DD
    } catch (e: Exception) {
        dateString
    }
}
