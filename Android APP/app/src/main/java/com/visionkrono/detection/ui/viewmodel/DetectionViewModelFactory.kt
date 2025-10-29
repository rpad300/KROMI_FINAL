package com.visionkrono.detection.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.visionkrono.detection.data.repository.SupabaseRepository
import com.visionkrono.detection.domain.location.LocationService

class DetectionViewModelFactory(
    private val supabaseRepository: SupabaseRepository,
    private val locationService: LocationService,
    private val supabaseUrl: String,
    private val supabaseServiceKey: String // Service Role Key
) : ViewModelProvider.Factory {
    
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DetectionViewModel::class.java)) {
            return DetectionViewModel(
                supabaseRepository,
                locationService,
                supabaseUrl,
                supabaseServiceKey
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
